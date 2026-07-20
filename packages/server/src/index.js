import fs from 'fs'
import path from 'path'
import querystring from 'querystring'
import readline from 'node:readline'

import { stdin, stdout } from 'node:process'
import { toSegments, executeMiddlewareChain } from './utils'

import {
  buildSocketState,
  buildSocketServer,
  buildSocketHandlers,
  buildSocketCommands,
} from './socket'

import {
  NotFoundError,
  MethodNotAllowedError,
} from './errors'

export * from './errors'

export {
  parseJsonBody,
  setValidationFormats,
  validateSchemas,
} from './middleware'

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

/* istanbul ignore if */
if (process.stdin.isTTY) {
  process.stdin.setRawMode(true)
}

const rl = readline.createInterface({
  input: stdin,
  output: stdout,
})

function methodNotAllowedHandler (_req) {
  throw new MethodNotAllowedError()
}

function defaultMethodMap () {
  return {
    HEAD: methodNotAllowedHandler,
    GET: methodNotAllowedHandler,
    PUT: methodNotAllowedHandler,
    POST: methodNotAllowedHandler,
    PATCH: methodNotAllowedHandler,
    DELETE: methodNotAllowedHandler,
  }
}

function buildBunRequest (bunReq, server) {
  const url = new URL(bunReq.url)
  const qs = url.search.replace('?', '')
  const json = () => bunReq.json()

  return {
    method: bunReq.method,
    route: url.pathname,
    headers: bunReq.headers,
    params: bunReq.params ?? {},
    query: querystring.parse(qs),
    raw: bunReq,
    server,
    json,
  }
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

function validateDirectory (targetPath, entries) {
  const filenames = entries
    .filter(entry => entry.stat.isFile())
    .map(entry => path.basename(entry.path))

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
    allowedFiles.includes(path.basename(item)),
  )
}

function getMethodFilePaths (targetPath) {
  return getFilteredFilePaths(targetPath, ALLOWED_FILES_METHODS)
}

function getMetaFilePaths (targetPath) {
  return getFilteredFilePaths(targetPath, ALLOWED_FILES_META)
}

function selectMetaPaths (metadata, modulePath) {
  return metadata
    .filter(metaPath => modulePath.startsWith(path.dirname(metaPath)))
    .sort((a, b) => a.length - b.length)
}

async function resolveMetaMiddleware (metaPaths) {
  const modules = await Promise.all(metaPaths.map(item => import(item)))

  return modules
    .map(item => item.middleware)
    .reduce((accum, curr) => [
      ...accum,
      ...(curr || []),
    ], [])
}

function buildRoutePaths (rootPath, mountPath, metadata) {
  const paths = getMethodFilePaths(rootPath)

  return paths.map(modulePath => {
    const trimmedPath = modulePath.replace(rootPath, '')
    const segments = trimmedPath.split('.')[0].split('/')
    const lastIndex = segments.length - 1
    const basePath = segments.slice(0, segments.length - 1).join('/')

    const joinedPath = [mountPath, basePath]
      .filter(item => item)
      .join('') || '/'

    const metaMiddlewarePath = selectMetaPaths(metadata, modulePath)

    return {
      method: segments[lastIndex].toUpperCase(),
      path: joinedPath,
      metaMiddlewarePath,
      modulePath,
    }
  })
}

async function buildChain (route, rootMiddleware) {
  const module = await import(route.modulePath)
  const metaMiddleware = await resolveMetaMiddleware(route.metaMiddlewarePath)

  if (!module.default) {
    throw new ReferenceError(`
No default export defined in:
${route.modulePath}
    `.trim())
  }

  const baseChain = Array.isArray(module.default)
    ? module.default
    : [module.default]

  return {
    method: route.method,
    path: route.path,
    chain: [
      ...rootMiddleware,
      ...metaMiddleware,
      ...baseChain,
    ],
  }
}

function buildNormalRoutes (routePaths, rootMiddleware) {
  return Promise.all(
    routePaths.map(route => buildChain(route, rootMiddleware)),
  )
}

async function buildMergedRoutes (routePaths, middleware, state, opts) {
  const { basePath, mountPath, metadata } = opts
  const socketRoutes = buildSocketHandlers(state)

  for (const socketRoute of socketRoutes) {
    const mountedPath = `${mountPath}${socketRoute.path}`

    const targetItem = routePaths.find(item => (
      item.method === socketRoute.method &&
      item.path === mountedPath
    ))

    if (targetItem) {
      targetItem.chain.push(socketRoute.handler)

      continue
    }

    const method = socketRoute.method.toLowerCase()
    const modulePath = path.join(basePath, socketRoute.path, `${method}.js`)
    const metaPaths = selectMetaPaths(metadata, modulePath)
    const metaMiddleware = await resolveMetaMiddleware(metaPaths)

    routePaths.push({
      method: socketRoute.method,
      path: mountedPath,
      chain: [
        ...middleware,
        ...metaMiddleware,
        socketRoute.handler,
      ],
    })
  }

  return routePaths
}

function  buildSocketRoutes (mergedRoutes) {
  return mergedRoutes.map(route => ({
    ...route,
    segments: toSegments(route.path),
  }))
}

function buildModuleRoutes (routePaths) {
  return routePaths.map(route => {
    const handler = async (bunReq, server) => {
      const req = buildBunRequest(bunReq, server)

      return executeMiddlewareChain(req, route.chain)
    }

    return {
      method: route.method,
      path: route.path,
      handler,
    }
  })
}

function buildServerRoutes (moduleRoutes) {
  return moduleRoutes.reduce((accum, curr) => {
    if (!accum[curr.path]) {
      accum[curr.path] = defaultMethodMap()
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

async function buildRoutes (rootPath, state, opts) {
  const basePath = `${rootPath}/api`
  const mountPath = opts.mountPath || ''
  const middleware = opts.middleware || []
  const metadata = getMetaFilePaths(basePath)
  const routePaths = buildRoutePaths(basePath, mountPath, metadata)
  const normalRoutes = await buildNormalRoutes(routePaths, middleware)

  const routingOpts = {
    basePath,
    mountPath,
    metadata,
  }

  const mergedRoutes = await buildMergedRoutes(
    normalRoutes,
    middleware,
    state,
    routingOpts,
  )

  const socketRoutes = buildSocketRoutes(mergedRoutes)
  const moduleRoutes = buildModuleRoutes(socketRoutes)
  const serverRoutes = buildServerRoutes(moduleRoutes)
  const outputRoutes = buildOutputRoutes(moduleRoutes)

  return {
    server: serverRoutes,
    socket: socketRoutes,
    output: outputRoutes,
  }
}

function buildServer (port, routes, state, opts) {
  const hostname = opts.hostname || '0.0.0.0'
  const websocketServer = buildSocketServer(routes.socket, state)

  return Bun.serve({
    port,
    hostname,
    routes: routes.server,
    websocket: websocketServer,
    async fetch (_req, _server) {
      throw new NotFoundError()
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
  const state = buildSocketState(opts)
  const routes = await buildRoutes(rootPath, state, opts)
  const server = buildServer(port, routes, state, opts)
  const commands = buildSocketCommands(state)

  processIO(port, server, opts)

  return {
    routes: routes.output,
    server,
    commands,
  }
}
