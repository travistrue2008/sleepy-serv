import fs from 'fs'
import path from 'path'
import querystring from 'querystring'
import readline from 'node:readline'

import { stdin, stdout } from 'node:process'

import {
  toSegments,
  executeMiddlewareChain,
} from './utils'

import {
  buildSocketState,
  buildSocketServer,
  buildSocketHandlers,
  buildSocketCommands,
} from './socket'

import {
  RequestError,
  NotFoundError,
  MethodNotAllowedError,
  InternalServerError,
} from './errors'

import type { BunRequest } from 'bun'

import type {
  HttpMethod,
  Middleware,
  MiddlewareChain,
  EndpointRequest,
  ActiveSessions,
  AppOptions,
  Server,
} from './utils'

import type {
  SocketRoute,
  SocketState,
  SocketCommands,
} from './socket'

export * from './errors'
export { StatusCode, CloseReason } from './utils'

export {
  parseJsonBody,
  setValidationFormats,
  validateSchemas,
} from './middleware'

export type { SocketCommands } from './socket'
export type { HttpMethod, ActiveSessions } from './utils'

export type {
  AppOptions,
  BaseRequest,
  EndpointRequest,
  FormattedError,
  Handler,
  Middleware,
  MiddlewareChain,
  NextFn,
  HandlerResult,
  Request,
  Server,
  SocketConnection,
  SocketOptions,
  WebSocketRequest,
} from './utils'

export type {
  FormatterField,
  FormatterSchema,
  ValidationSchemas,
} from './middleware'

type OutputRoutes = Record<string, string[]>
type ServerRoutes = Record<string, Record<string, EndpointHandler>>

type EndpointHandler = (
  bunReq: BunRequest,
  server: Server,
) => Promise<Response>

type DirEntry = {
  path: string
  stat: fs.Stats
}

type RoutePath = {
  method: HttpMethod
  path: string
  metaMiddlewarePath: string[]
  modulePath: string
}

type ChainRoute = {
  method: HttpMethod
  path: string
  chain: MiddlewareChain
}

type ModuleRoute = {
  method: HttpMethod
  path: string
  handler: EndpointHandler
}

type RoutingOptions = {
  basePath: string
  mountPath: string
  metadata: string[]
}

type AppRoutes = {
  server: ServerRoutes
  output: OutputRoutes
  socket: SocketRoute[]
}

type CloseFn = (force?: boolean) => Promise<void>

export type App = {
  server: Server
  commands: SocketCommands
  routes: OutputRoutes
  close: CloseFn
}

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

function methodNotAllowedHandler (_req: unknown): never {
  throw new MethodNotAllowedError()
}

function defaultMethodMap (): Record<string, EndpointHandler> {
  return {
    HEAD: methodNotAllowedHandler,
    GET: methodNotAllowedHandler,
    PUT: methodNotAllowedHandler,
    POST: methodNotAllowedHandler,
    PATCH: methodNotAllowedHandler,
    DELETE: methodNotAllowedHandler,
  }
}

function buildEndpointRequest (
  bunReq: BunRequest,
  server: Server,
  activeSessions: ActiveSessions,
): EndpointRequest {
  const url = new URL(bunReq.url)
  const qs = url.search.replace('?', '')

  let bodyPromise: Promise<unknown> | null = null

  const json = (): Promise<unknown> => {
    if (!bodyPromise) {
      bodyPromise = bunReq.json()
    }

    return bodyPromise
  }

  return {
    method: bunReq.method as HttpMethod,
    route: url.pathname,
    headers: bunReq.headers,
    params: bunReq.params ?? {},
    query: querystring.parse(qs),
    raw: bunReq,
    server,
    json,
    ws: {
      active: activeSessions,
    },
  }
}

function validateLeafDirectory (
  targetPath: string,
  filenames: string[],
  entries: DirEntry[],
): void {
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

function validateDirectory (targetPath: string, entries: DirEntry[]): void {
  const filenames = entries
    .filter(entry => entry.stat.isFile())
    .map(entry => path.basename(entry.path))

  validateLeafDirectory(targetPath, filenames, entries)
}

function getAllFilePathsRec (targetPath: string, paths: string[]): string[] {
  const entries = fs.readdirSync(targetPath)

  const children = entries.map(item => {
    const fullPath = path.join(targetPath, item)

    return {
      path: fullPath,
      stat: fs.statSync(fullPath),
    }
  })

  validateDirectory(targetPath, children)

  return children.reduce<string[]>((accum, curr) => {
    const result = curr.stat.isDirectory()
      ? getAllFilePathsRec(curr.path, paths)
      : [curr.path]

    return [...accum, ...result]
  }, [])
}

function getFilteredFilePaths (
  targetPath: string,
  allowedFiles: string[],
): string[] {
  const allPaths = getAllFilePathsRec(targetPath, [])

  return allPaths.filter(item =>
    allowedFiles.includes(path.basename(item)),
  )
}

function getMethodFilePaths (targetPath: string): string[] {
  return getFilteredFilePaths(targetPath, ALLOWED_FILES_METHODS)
}

function getMetaFilePaths (targetPath: string): string[] {
  return getFilteredFilePaths(targetPath, ALLOWED_FILES_META)
}

function selectMetaPaths (metadata: string[], modulePath: string): string[] {
  return metadata
    .filter(metaPath => modulePath.startsWith(path.dirname(metaPath)))
    .sort((a, b) => a.length - b.length)
}

async function resolveMetaMiddleware (
  metaPaths: string[],
): Promise<Middleware[]> {
  const modules = await Promise.all(metaPaths.map(item => import(item)))

  return modules
    .map(item => item.middleware)
    .reduce((accum, curr) => [
      ...accum,
      ...(curr || []),
    ], [])
}

function buildRoutePaths (
  rootPath: string,
  mountPath: string,
  metadata: string[],
): RoutePath[] {
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
    const rawMethod = segments[lastIndex].toUpperCase()

    return {
      method: rawMethod as HttpMethod,
      path: joinedPath,
      metaMiddlewarePath,
      modulePath,
    }
  })
}

async function buildChain (
  route: RoutePath,
  rootMiddleware: Middleware[],
): Promise<ChainRoute> {
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

function buildNormalRoutes (
  routePaths: RoutePath[],
  rootMiddleware: Middleware[],
): Promise<ChainRoute[]> {
  return Promise.all(
    routePaths.map(route => buildChain(route, rootMiddleware)),
  )
}

async function buildMergedRoutes (
  routePaths: ChainRoute[],
  middleware: Middleware[],
  state: SocketState,
  opts: RoutingOptions,
): Promise<ChainRoute[]> {
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

function buildSocketRoutes (mergedRoutes: ChainRoute[]): SocketRoute[] {
  return mergedRoutes.map(route => ({
    ...route,
    segments: toSegments(route.path),
  }))
}

function buildModuleRoutes (
  socketRoutes: SocketRoute[],
  state: SocketState,
): ModuleRoute[] {
  return socketRoutes.map(route => {
    const handler: EndpointHandler = async (bunReq, server) => {
      const req = buildEndpointRequest(
        bunReq,
        server,
        state.activeSessions,
      )

      return executeMiddlewareChain(req, route.chain)
    }

    return {
      method: route.method,
      path: route.path,
      handler,
    }
  })
}

function buildServerRoutes (moduleRoutes: ModuleRoute[]): ServerRoutes {
  return moduleRoutes.reduce<ServerRoutes>(
    (accum, curr) => {
      if (!accum[curr.path]) {
        accum[curr.path] = defaultMethodMap()
      }

      accum[curr.path][curr.method] = curr.handler

      return accum
    }, {})
}

function buildOutputRoutes (moduleRoutes: ModuleRoute[]): OutputRoutes {
  return moduleRoutes.reduce<OutputRoutes>((accum, curr) => {
    accum[curr.path] = accum[curr.path] || []
    accum[curr.path].push(curr.method)

    return accum
  }, {})
}

async function buildRoutes (
  rootPath: string,
  state: SocketState,
  opts: AppOptions,
): Promise<AppRoutes> {
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
  const moduleRoutes = buildModuleRoutes(socketRoutes, state)
  const serverRoutes = buildServerRoutes(moduleRoutes)
  const outputRoutes = buildOutputRoutes(moduleRoutes)

  return {
    server: serverRoutes,
    socket: socketRoutes,
    output: outputRoutes,
  }
}

function buildServer (
  port: number,
  routes: AppRoutes,
  state: SocketState,
  opts: AppOptions,
): Server {
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

      const isRequestError = !(err instanceof RequestError)
      const httpError = isRequestError ? new InternalServerError() : err
      const { status } = httpError.constructor as typeof RequestError

      return Response.json(httpError.output, { status })
    },
  })
}

function processIO (
  port: number,
  server: Server,
  opts: AppOptions,
): CloseFn {
  const onClose = opts.onClose || (() => {})

  console.info(`Running on port: ${port}`)
  console.info('')
  console.info('Press Ctrl+D to gracefully shutdown')
  console.info('')

  const shutdown = async (force = false): Promise<void> => {
    await server.stop(force)
    await onClose()
  }

  if (!stdin.isTTY) {
    return shutdown
  }

  const rl = readline.createInterface({
    input: stdin,
    output: stdout,
  })

  const handleClose = async (): Promise<void> => {
    await shutdown()
    process.exit(0)
  }

  rl.on('close', handleClose)

  return async (force = false) => {
    rl.off('close', handleClose)
    rl.close()

    await shutdown(force)
  }
}

export async function createApp (
  port: number,
  rootPath: string,
  opts: AppOptions = {},
): Promise<App> {
  const state = buildSocketState(opts)
  const routes = await buildRoutes(rootPath, state, opts)
  const server = buildServer(port, routes, state, opts)
  const commands = buildSocketCommands(state)
  const close = processIO(port, server, opts)

  return {
    routes: routes.output,
    server,
    commands,
    close,
  }
}
