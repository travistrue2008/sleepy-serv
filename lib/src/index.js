import fs from 'fs'
import path from 'path'
import querystring from 'querystring'
import readline from 'node:readline'
import { stdin, stdout } from 'node:process'

import {
  NotFoundError,
  MethodNotAllowedError,
} from './errors.js'

process.stdin.setRawMode(true)

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

function buildRoutesMetadata (rootPath, mountPath) {
  const paths = getAllFilePathsRec(rootPath)

  return paths.map(modulePath => {
    const trimmedPath = modulePath.replace(rootPath, '')
    const segments = trimmedPath.split('.')[0].split('/')
    const lastIndex = segments.length - 1
    const basePath = segments.slice(0, segments.length - 1).join('/')

    return {
      method: segments[lastIndex].toUpperCase(),
      path: path.join(mountPath, basePath),
      modulePath,
    }
  })
}

async function buildHandlers (route, rootMiddleware) {
  const module = await import(route.modulePath)

  const baseChain = Array.isArray(module.default)
    ? module.default
    : [module.default]

  const middlewareChain = [
    ...rootMiddleware,
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
  const metadata = buildRoutesMetadata(rootPath, mountPath)

  const moduleRoutes = await Promise.all(
    metadata.map(route => buildHandlers(route, rootMiddleware))
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
  const mountPath = opts.mountPath || ''
  const handleClose = opts.onClose || (() => {})
  const rootMiddleware = opts.middleware || []

  const routes = await buildRoutes(
    `${rootPath}/api`,
    mountPath,
    rootMiddleware,
  )

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
