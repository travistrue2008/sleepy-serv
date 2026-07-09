import fs from 'fs'
import path from 'path'
import querystring from 'querystring'
import readline from 'node:readline'

import * as uuid from 'uuid'
import * as _middleware from './middleware'

import { stdin, stdout } from 'node:process'
import { executeMiddlewareChain } from './utils'

import {
  NotFoundError,
  MethodNotAllowedError,
} from './errors'

import {
  buildSocketRoutes,
  createSocketHandler,
} from './socket'

export * from './errors'

const ALLOWED_FILES_META = ['meta.js', 'meta.ts']

const ALLOWED_FILES_METHODS = [
  'head.js',
  'head.ts',
  'get.js',
  'get.ts',
  'put.js',
  'put.ts',
  'post.js',
  'post.ts',
  'patch.js',
  'patch.ts',
  'delete.js',
  'delete.ts',
]

const RESERVED_ROUTES = ['/ws']

// const ALLOWED_FILES_ALL = [
//   ...ALLOWED_FILES_META,
//   ...ALLOWED_FILES_METHODS,
// ]

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

/* TODO: add whitelist support */
function validateDirectoryIllegalFiles (targetPath, filenames) {
  //   const hasInvalidFiles = filenames.some(filename =>
  //     !ALLOWED_FILES_ALL.includes(filename)
  //   )

  //   if (hasInvalidFiles) {
  //     throw new TypeError(`
  // Directory contains illegal files:
  // ${targetPath}
  //     `.trim())
  //   }
}

function validateLeafDirectory (targetPath, filenames, entries) {
  const hasDirectories = entries.some(entry => entry.stat.isDirectory())

  if (!hasDirectories) {
    const hasMethodEntry = filenames.some(filename =>
      ALLOWED_FILES_METHODS.includes(filename),
    )

    if (!hasMethodEntry) {
      throw new TypeError(`
Directory is a leaf, but doesn't contain a method file:
${targetPath}
      `.trim())
    }
  }
}

function validateReservedRoutes (rootPath) {
  const reservedPaths = RESERVED_ROUTES.map(route =>
    path.join(rootPath, 'api', route),
  )

  const foundItems = reservedPaths.filter(item => fs.existsSync(item))

  if (foundItems.length) {
    throw new TypeError(`
Illegal directory:
${foundItems.join('\n')}

This is a reserved directory.
    `.trim())
  }
}

function validateDirectory (targetPath, entries) {
  const filenames = entries
    .filter(entry => entry.stat.isFile())
    .map(entry => path.basename(entry.path))

  validateDirectoryIllegalFiles(targetPath, filenames)
  validateLeafDirectory(targetPath, filenames, entries)
}

function checkForSocket (req, server, opts) {
  const url = new URL(req.url)

  if (url.pathname === '/ws') {
    const useSocket = server.upgrade(req, {
      data: {
        clientId: uuid.v4(),
      },
    })

    if (!useSocket) {
      throw new NotFoundError()
    }

    return true
  }

  return false
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
    allowedFiles.includes(path.basename(item)),
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
    route.metaMiddlewarePath.map(item => import(item)),
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

  const handler = async bunReq => {
    const query = bunReq.url.split('?')[1]

    const req = {
      method: bunReq.method,
      url: bunReq.url,
      route: new URL(bunReq.url).pathname,
      headers: bunReq.headers,
      query: query ? querystring.parse(query) : {},
      params: bunReq.params ?? {},
      body: null,
      json: () => bunReq.json(),
    }

    return executeMiddlewareChain(req, {}, middlewareChain)
  }

  return {
    method: route.method,
    path: route.path,
    handler,
    middlewareChain,
  }
}

function buildModuleRoutes (routePaths, rootMiddleware) {
  return Promise.all(
    routePaths.map(route => buildHandlers(route, rootMiddleware)),
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
  validateReservedRoutes(rootPath)

  const basePath = `${rootPath}/api`
  const mountPath = opts.mountPath || ''
  const rootMiddleware = opts.middleware || []
  const routePaths = buildRoutesPaths(basePath, mountPath)
  const moduleRoutes = await buildModuleRoutes(routePaths, rootMiddleware)
  const serverRoutes = buildServerRoutes(moduleRoutes)
  const outputRoutes = buildOutputRoutes(moduleRoutes)
  const socketRoutes = buildSocketRoutes(moduleRoutes)

  return {
    server: serverRoutes,
    output: outputRoutes,
    socket: socketRoutes,
  }
}

function buildServer (port, routes, opts) {
  const hostname = opts.hostname || '0.0.0.0'

  return Bun.serve({
    port,
    hostname,
    routes: routes.server,
    websocket: createSocketHandler(routes.socket),
    fetch (req, server) {
      const upgraded = checkForSocket(req, server, opts)

      if (!upgraded) {
        throw new NotFoundError()
      }
    },
    error (err) {
      console.error(err)

      const status = err.constructor.status ?? 500

      return err.output !== undefined
        ? Response.json(err.output, { status })
        : new Response(err.message, { status })
    },
  })
}

function processIO (port, server, opts) {
  const onClose = opts.onClose || (() => { })

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
