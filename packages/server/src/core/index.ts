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
  Handler,
  Server,
} from './utils'

import type { SocketCommands } from './utils'

import type {
  SocketOptions,
  SocketRoute,
  SocketState,
} from './socket'

export * from './errors'
export { ServerCloseSignals } from './socket'

export {
  StatusCode,
  HttpMethod,
  SessionType,
  SessionFilter,
} from './utils'

export {
  parseJsonBody,
  setValidationFormats,
  validateSchemas,
} from './middleware'

export type {
  ActiveSession,
  ActiveSessions,
  InactiveSession,
  SocketConnection,
  SocketOptions,
} from './socket'

export type {
  AsyncHandlerResult,
  BaseRequest,
  CloseSignal,
  EndpointRequest,
  FilterFn,
  FormattedError,
  Handler,
  HandlerResult,
  Middleware,
  MiddlewareChain,
  NextFn,
  Request,
  Server,
  SessionEntry,
  SocketCommands,
  SocketData,
  WebSocketRequest,
} from './utils'

export type {
  FormatterField,
  FormatterSchema,
  ValidationSchemas,
} from './middleware'

export type RouteDefinition<T = void> = {
  method: HttpMethod
  path: string
  chain: Handler<T> | MiddlewareChain<T>
}

export type MetaEntry<T = void> = {
  path: string
  middleware: Middleware<T>[]
}

export type RouteConfig<T = void> = {
  routes: RouteDefinition<T>[]
  meta?: MetaEntry<T>[]
}

export type AppOptions<T = void> = {
  hostname?: string
  mountPath?: string
  middleware?: Middleware<T>[]
  ws?: boolean | SocketOptions
  onClose?: () => Promise<void> | void
}

type OutputRoutes = Record<string, string[]>

type ServerRoutes<T = void> =
  Record<string, Record<string, EndpointHandler<T>>>

type EndpointHandler<T = void> = (
  bunReq: BunRequest,
  server: Server<T>,
) => AsyncHandlerResult

type ChainRoute<T = void> = {
  method: HttpMethod
  path: string
  chain: MiddlewareChain<T>
}

type ModuleRoute<T = void> = {
  method: HttpMethod
  path: string
  handler: EndpointHandler<T>
}

type AppRoutes<T = void> = {
  server: ServerRoutes<T>
  output: OutputRoutes
  socket: SocketRoute<T>[]
}

type CloseFn = (force?: boolean) => Promise<void>

export type App<T = void> = {
  server: Server<T>
  routes: OutputRoutes
  ws: SocketCommands<T>
  close: CloseFn
}

function methodNotAllowedHandler (_req: unknown): never {
  throw new MethodNotAllowedError()
}

function defaultMethodMap<T> (): Record<string, EndpointHandler<T>> {
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

function buildEndpointRequest<T> (
  bunReq: BunRequest,
  server: Server<T>,
  ws: SocketCommands<T>,
): EndpointRequest<T> {
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

function normalizeChain<T> (route: RouteDefinition<T>): ChainRoute<T> {
  const chain = Array.isArray(route.chain)
    ? route.chain
    : [route.chain]

  return {
    method: route.method,
    path: route.path,
    chain,
  }
}

function buildMergedRoutes<T> (
  routePaths: ChainRoute<T>[],
  middleware: Middleware<T>[],
  meta: MetaEntry<T>[],
  state: SocketState<T>,
  mountPath: string,
): ChainRoute<T>[] {
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

function buildSocketRoutes<T> (
  mergedRoutes: ChainRoute<T>[],
): SocketRoute<T>[] {
  return mergedRoutes.map(route => ({
    ...route,
    segments: toSegments(route.path),
  }))
}

function buildModuleRoutes<T> (
  socketRoutes: SocketRoute<T>[],
  ws: SocketCommands<T>,
): ModuleRoute<T>[] {
  return socketRoutes.map(route => {
    const handler: EndpointHandler<T> = async (bunReq, server) => {
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

function buildServerRoutes<T> (
  moduleRoutes: ModuleRoute<T>[],
): ServerRoutes<T> {
  return moduleRoutes.reduce<ServerRoutes<T>>(
    (accum, curr) => {
      if (!accum[curr.path]) {
        accum[curr.path] = defaultMethodMap<T>()
      }

      accum[curr.path][curr.method] = curr.handler

      return accum
    }, {})
}

function buildOutputRoutes<T> (moduleRoutes: ModuleRoute<T>[]): OutputRoutes {
  return moduleRoutes.reduce<OutputRoutes>((accum, curr) => {
    accum[curr.path] = accum[curr.path] || []
    accum[curr.path].push(curr.method)

    return accum
  }, {})
}

function buildRoutes<T> (
  config: RouteConfig<T>,
  state: SocketState<T> | null,
  ws: SocketCommands<T>,
  opts: AppOptions<T>,
): AppRoutes<T> {
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

function buildServer<T> (
  port: number,
  routes: AppRoutes<T>,
  state: SocketState<T> | null,
  ws: SocketCommands<T>,
  opts: AppOptions<T>,
): Server<T> {
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
  }) as Server<T>
}

function processIO<T> (server: Server<T>, opts: AppOptions<T>): CloseFn {
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

export function createApp<T = void> (
  port: number,
  config: RouteConfig<T>,
  opts: AppOptions<T> = {},
): App<T> {
  const socketOpts = resolveSocketOptions(opts.ws)

  const state = socketOpts
    ? buildSocketState<T>(socketOpts)
    : null

  const ws = state
    ? buildSocketCommands<T>(state)
    : buildDisabledSocketCommands<T>()

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
