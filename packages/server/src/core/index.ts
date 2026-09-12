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
  buildDisabledSocketCommands,
} from './socket'

import {
  RequestError,
  NotFoundError,
  MethodNotAllowedError,
  InternalServerError,
} from './errors'

import type { BunRequest } from 'bun'

import type {
  AsyncHandlerResult,
  HttpMethod,
  Middleware,
  MiddlewareChain,
  EndpointRequest,
  MetaEntry,
  RouteConfig,
  RouteDefinition,
  SocketCommands,
  SocketOptions,
  AppOptions,
  Server,
} from './utils'

import type {
  SocketRoute,
  SocketState,
} from './socket'

export * from './errors'
export { StatusCode, CloseCode, CloseReason, HttpMethod } from './utils'

export {
  parseJsonBody,
  setValidationFormats,
  validateSchemas,
} from './middleware'

export type { FilterFn, SessionEntry, SocketCommands } from './utils'

export type {
  AppOptions,
  AsyncHandlerResult,
  BaseRequest,
  EndpointRequest,
  FormattedError,
  Handler,
  MetaEntry,
  Middleware,
  MiddlewareChain,
  NextFn,
  HandlerResult,
  Request,
  RouteConfig,
  RouteDefinition,
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
) => AsyncHandlerResult

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

type AppRoutes = {
  server: ServerRoutes
  output: OutputRoutes
  socket: SocketRoute[]
}

type CloseFn = (force?: boolean) => Promise<void>

export type App = {
  server: Server
  routes: OutputRoutes
  ws: SocketCommands
  close: CloseFn
}

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

function resolveSocketOptions (
  ws: boolean | SocketOptions | undefined,
): SocketOptions | null {
  if (!ws) {
    return null
  }

  if (ws === true) {
    return {}
  }

  return ws
}

function buildEndpointRequest (
  bunReq: BunRequest,
  server: Server,
  ws: SocketCommands,
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
    ws,
  }
}

function normalizeChain (route: RouteDefinition): ChainRoute {
  const chain = Array.isArray(route.chain)
    ? route.chain
    : [route.chain]

  return {
    method: route.method,
    path: route.path,
    chain,
  }
}

function buildMergedRoutes (
  routePaths: ChainRoute[],
  middleware: Middleware[],
  meta: MetaEntry[],
  state: SocketState,
  mountPath: string,
): ChainRoute[] {
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

    const metaMiddleware = meta
      .filter(entry => socketRoute.path.startsWith(entry.path))
      .sort((a, b) => a.path.length - b.path.length)
      .flatMap(entry => entry.middleware)

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
  ws: SocketCommands,
): ModuleRoute[] {
  return socketRoutes.map(route => {
    const handler: EndpointHandler = async (bunReq, server) => {
      const req = buildEndpointRequest(bunReq, server, ws)

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

function buildRoutes (
  config: RouteConfig,
  state: SocketState | null,
  ws: SocketCommands,
  opts: AppOptions,
): AppRoutes {
  const mountPath = opts.mountPath || ''
  const middleware = opts.middleware || []
  const meta = config.meta || []

  const normalRoutes = config.routes.map(route => {
    const normalized = normalizeChain(route)
    const routePath = normalized.path === '/' ? '' : normalized.path

    const joinedPath = [mountPath, routePath]
      .filter(item => item)
      .join('') || '/'

    return {
      method: normalized.method,
      path: joinedPath,
      chain: [
        ...middleware,
        ...normalized.chain,
      ],
    }
  })

  const mergedRoutes = state
    ? buildMergedRoutes(normalRoutes, middleware, meta, state, mountPath)
    : normalRoutes

  const socketRoutes = buildSocketRoutes(mergedRoutes)
  const moduleRoutes = buildModuleRoutes(socketRoutes, ws)
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
  state: SocketState | null,
  ws: SocketCommands,
  opts: AppOptions,
): Server {
  const hostname = opts.hostname || '0.0.0.0'

  const websocket = state
    ? buildSocketServer(routes.socket, state, ws)
    : undefined

  return Bun.serve({
    port,
    hostname,
    routes: routes.server,
    ...(websocket ? { websocket } : {}),
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
  }) as Server
}

function processIO (server: Server, opts: AppOptions): CloseFn {
  const onClose = opts.onClose || (() => {})

  console.info(`Running on port: ${server.port}`)
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

export function createApp (
  port: number,
  config: RouteConfig,
  opts: AppOptions = {},
): App {
  const socketOpts = resolveSocketOptions(opts.ws)

  const state = socketOpts
    ? buildSocketState(socketOpts)
    : null

  const ws = state
    ? buildSocketCommands(state)
    : buildDisabledSocketCommands()

  const routes = buildRoutes(config, state, ws, opts)
  const server = buildServer(port, routes, state, ws, opts)
  const close = processIO(server, opts)

  return {
    routes: routes.output,
    server,
    ws,
    close,
  }
}
