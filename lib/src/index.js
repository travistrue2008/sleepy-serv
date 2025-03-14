import fs from 'fs'
import path from 'path'
import querystring from 'querystring'
import readline from 'node:readline'
import { stdin, stdout } from 'node:process'

import * as _middleware from './middleware.js'

import {
  NotFoundError,
  MethodNotAllowedError,
} from './errors'

export * from './errors'

const ALLOWED_FILES_META = ['meta.js']

const ALLOWED_FILES_METHODS = [
  'head.js',
  'get.js',
  'put.js',
  'post.js',
  'patch.js',
  'delete.js',
]

const ALLOWED_FILES_ALL = [
  ...ALLOWED_FILES_META,
  ...ALLOWED_FILES_METHODS,
]

/* istanbul ignore if */
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true)
}

export const middleware = _middleware

const rl = readline.createInterface({
  input: stdin,
  output: stdout,
})

function methodNotAllowedHandler (_req) {
  throw new MethodNotAllowedError()
}

function validateDirectoryIllegalFiles (targetPath, filenames) {
  const hasInvalidFiles = filenames.some(filename =>
    !ALLOWED_FILES_ALL.includes(filename)
  )

  if (hasInvalidFiles) {
    throw new TypeError(`
Directory contains illegal files:
${targetPath}
    `.trim())
  }
}

function validateLeafDirectory (targetPath, filenames, entries) {
  const hasDirectories = entries.some(entry => entry.stat.isDirectory())

  if (!hasDirectories) {
    const hasMethodEntry = filenames.some(filename =>
      ALLOWED_FILES_METHODS.includes(filename)
    )

    if (!hasMethodEntry) {
      throw new TypeError(`
Directory is a leaf, but doesn't contain a method file:
${targetPath}
      `.trim())
    }
  }
}

function validateDirectory (targetPath, entries) {
  const filenames = entries
    .filter(entry => entry.stat.isFile())
    .map(entry => path.basename(entry.path))

  validateDirectoryIllegalFiles(targetPath, filenames)
  validateLeafDirectory(targetPath, filenames, entries)
}

function getAllFilePathsRec (targetPath, paths) {
  const entries = fs.readdirSync(targetPath)

  const children = entries.map(item => {
    const fullPath = path.join(targetPath, item)

    return {
      path: fullPath,
      stat: fs.statSync(fullPath),
    }
  })

  validateDirectory(targetPath, children)

  return children.reduce((accum, curr) => {
      const result = curr.stat.isDirectory()
        ? getAllFilePathsRec(curr.path, paths)
        : [curr.path]

      return [...accum, ...result]
    }, [])
}

function getFilteredFilePaths (targetPath, allowedFiles) {
  const allPaths = getAllFilePathsRec(targetPath, [])

  return allPaths.filter(item =>
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

    const joinedPath = [mountPath, basePath]
      .filter(item => item)
      .join('') || '/'

    const metaMiddlewarePath = metadata
      .filter(metaPath => {
        const metaBasePath = path.dirname(metaPath)

        return modulePath.startsWith(metaBasePath)
      })
      .sort((a, b) => a.length - b.length)

    return {
      method: segments[lastIndex].toUpperCase(),
      path: joinedPath,
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

  if (!module.default) {
    throw new ReferenceError(`
No default export defined in:
${route.modulePath}
    `.trim())
  }

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
    const res = {}

    req.query = query ? querystring.parse(query) : {}

    for (const fn of middlewareChain) {
      const response = await fn(req, res)

      if (response) {
        return response
      }
    }
  }

  return {
    method: route.method,
    path: route.path,
    handler,
  }
}

function buildModuleRoutes (routePaths, rootMiddleware) {
  return Promise.all(
    routePaths.map(route => buildHandlers(route, rootMiddleware))
  )
}

function buildServerRoutes (moduleRoutes) {
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

function buildOutputRoutes (moduleRoutes) {
  return moduleRoutes.reduce((accum, curr) => {
    accum[curr.path] = accum[curr.path] || []
    accum[curr.path].push(curr.method)

    return accum
  }, {})
}

async function buildRoutes (rootPath, opts) {
  const basePath = `${rootPath}/api`
  const mountPath = opts.mountPath || ''
  const rootMiddleware = opts.middleware || []
  const routePaths = buildRoutesPaths(basePath, mountPath)
  const moduleRoutes = await buildModuleRoutes(routePaths, rootMiddleware)
  const serverRoutes = buildServerRoutes(moduleRoutes)
  const outputRoutes = buildOutputRoutes(moduleRoutes)

  return {
    server: serverRoutes,
    output: outputRoutes,
  }
}

function buildServer (port, routes, opts) {
  const hostname = opts.hostname || '0.0.0.0'

  return Bun.serve({
    port,
    hostname,
    routes: routes.server,
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
}

function processIO (port, server, opts) {
  const onClose = opts.onClose || (() => {})

  console.info(`Running on port: ${port}`)
  console.info('')
  console.info('Press Ctrl+D to gracefully shutdown')
  console.info('')

  /* istanbul ignore next */
  rl.on('close', async () => {
    await server.stop()
    await onClose()
    process.exit(0)
  })
}

export async function createApp (port, rootPath, opts = {}) {
  const routes = await buildRoutes(rootPath, opts)
  const server = buildServer(port, routes, opts)

  processIO(port, server, opts)

  return {
    routes: routes.output,
    server,
  }
}
