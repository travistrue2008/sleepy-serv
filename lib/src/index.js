import fs from 'fs'
import path from 'path'
import querystring from 'querystring'
import readline from 'node:readline'
import { stdin, stdout } from 'node:process'

import * as _middleware from './middleware.js'

import {
  NotFoundError,
  MethodNotAllowedError,
} from './errors.js'

const ALLOWED_FILES_META = ['meta.js']

const ALLOWED_FILES_METHODS = [
  'head.js',
  'get.js',
  'put.js',
  'post.js',
  'patch.js',
  'delete.js',
]

const FORMATS_CUSTOM = {
  phone: /^\d{10}$/,
  postalCode: /^\d{5}$/,
  state: /^(([A][ELKSZR])|([C][AOT])|([D][EC])|([F][ML])|([G][AU])|([H][I])|([I][DLNA])|([K][SY])|([L][A])|([M][EHDAINSOT])|([N][EVHJMYCD])|([M][P])|([O][HKR])|([P][WAR])|([R][I])|([S][CD])|([T][NX])|([U][T])|([V][TIA])|([W][AVIY]))$/,
}

process.stdin.setRawMode(true)

export const middleware = _middleware

const rl = readline.createInterface({
  input: stdin,
  output: stdout,
})

function methodNotAllowedHandler (_req) {
  throw new MethodNotAllowedError()
}

function getAllFilePathsRec (targetPath, paths = []) {
  const entries = fs.readdirSync(targetPath)

  return entries.reduce((accum, curr) => {
    const currentPath = path.join(targetPath, curr)

    const result = fs.statSync(currentPath).isDirectory()
      ? getAllFilePathsRec(currentPath, paths)
      : [path.join(targetPath, curr)]

    return [...accum, ...result]
  }, [])
}

function getFilteredFilePaths (targetPath, allowedFiles) {
  return getAllFilePathsRec(targetPath)
    .filter(item =>
      allowedFiles.includes(path.basename(item))
    )
}

function getMethodFilePaths (targetPath) {
  return getFilteredFilePaths(targetPath, ALLOWED_FILES_METHODS)
}

function getMetaFilePaths (targetPath) {
  return getFilteredFilePaths(targetPath, ALLOWED_FILES_META)
}

function buildRoutesPaths (rootPath, mountPath) {
  const metadata = getMetaFilePaths(rootPath)
  const paths = getMethodFilePaths(rootPath)

  return paths.map(modulePath => {
    const trimmedPath = modulePath.replace(rootPath, '')
    const segments = trimmedPath.split('.')[0].split('/')
    const lastIndex = segments.length - 1
    const basePath = segments.slice(0, segments.length - 1).join('/')

    const metaMiddlewarePath = metadata.filter(metaPath => {
      const metaBasePath = path.dirname(metaPath)

      return modulePath.startsWith(metaBasePath)
    })

    return {
      method: segments[lastIndex].toUpperCase(),
      path: path.join(mountPath, basePath),
      metaMiddlewarePath,
      modulePath,
    }
  })
}

async function buildHandlers (route, rootMiddleware) {
  const module = await import(route.modulePath)

  const middlewareModules = await Promise.all(
    route.metaMiddlewarePath.map(item => import(item))
  )

  const metaMiddleware = middlewareModules
    .map(item => item.middleware)
    .reduce((accum, curr) => [
      ...accum,
      ...(curr || []),
    ], [])

  const baseChain = Array.isArray(module.default)
    ? module.default
    : [module.default]

  const middlewareChain = [
    ...rootMiddleware,
    ...metaMiddleware,
    ...baseChain,
  ]

  const handler = async req => {
    const query = req.url.split('?')[1]

    req.query = query ? querystring.parse(query) : {}

    for (const fn of middlewareChain) {
      const res = await fn(req)

      if (res) {
        return res
      }
    }
  }

  return {
    method: route.method,
    path: route.path,
    handler,
  }
}

async function buildRoutes (rootPath, mountPath, rootMiddleware) {
  const routePaths = buildRoutesPaths(rootPath, mountPath)

  const moduleRoutes = await Promise.all(
    routePaths.map(route => buildHandlers(route, rootMiddleware))
  )

  return moduleRoutes.reduce((accum, curr) => {
    if (!accum[curr.path]) {
      accum[curr.path] = {
        HEAD: methodNotAllowedHandler,
        GET: methodNotAllowedHandler,
        PUT: methodNotAllowedHandler,
        POST: methodNotAllowedHandler,
        PATCH: methodNotAllowedHandler,
        DELETE: methodNotAllowedHandler,
      }
    }

    accum[curr.path][curr.method] = curr.handler

    return accum
  }, {})
}

export async function createServer (port, rootPath, opts = {}) {
  const basePath = `${rootPath}/api`
  const mountPath = opts.mountPath || ''
  const handleClose = opts.onClose || (() => {})
  const rootMiddleware = opts.middleware || []
  const routes = await buildRoutes(basePath, mountPath, rootMiddleware)

  const server = Bun.serve({
    port,
    routes,
    fetch (_req) {
      throw new NotFoundError()
    },
    error (err) {
      console.error(err)

      return new Response(err.message, {
        status: err.constructor.statusCode || 500,
      })
    },
  })

  console.info(`Running on port: ${port}`)
  console.info('')
  console.info('Press Ctrl+D to gracefully shutdown')
  console.info('')

  rl.on('close', async () => {
    await server.stop()
    await handleClose()
    process.exit(0)
  })
}
