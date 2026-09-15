import type { ErrorObject } from 'ajv'
import type { BunRequest, Server as BunServer } from 'bun'

export type TimeoutHandle = ReturnType<typeof setTimeout>

export const HttpMethod = {
  Head: 'HEAD',
  Get: 'GET',
  Post: 'POST',
  Put: 'PUT',
  Patch: 'PATCH',
  Delete: 'DELETE',
} as const

export type HttpMethod = typeof HttpMethod[keyof typeof HttpMethod]

export const StatusCode = {
  Continue: 100,
  SwitchingProtocols: 101,
  Processing: 102,
  EarlyHints: 103,

  Ok: 200,
  Created: 201,
  Accepted: 202,
  NonAuthoritativeInformation: 203,
  NoContent: 204,
  ResetContent: 205,
  PartialContent: 206,
  MultiStatus: 207,
  AlreadyReported: 208,
  ImUsed: 226,

  MultipleChoices: 300,
  MovedPermanently: 301,
  Found: 302,
  SeeOther: 303,
  NotModified: 304,
  UseProxy: 305,
  TemporaryRedirect: 307,
  PermanentRedirect: 308,

  BadRequest: 400,
  Unauthorized: 401,
  PaymentRequired: 402,
  Forbidden: 403,
  NotFound: 404,
  MethodNotAllowed: 405,
  NotAcceptable: 406,
  ProxyAuthenticationRequired: 407,
  RequestTimeout: 408,
  Conflict: 409,
  Gone: 410,
  LengthRequired: 411,
  PreconditionFailed: 412,
  PayloadTooLarge: 413,
  UriTooLong: 414,
  UnsupportedMediaType: 415,
  RangeNotSatisfiable: 416,
  ExpectationFailed: 417,
  ImATeapot: 418,
  MisdirectedRequest: 421,
  UnprocessableContent: 422,
  Locked: 423,
  FailedDependency: 424,
  TooEarly: 425,
  UpgradeRequired: 426,
  PreconditionRequired: 428,
  TooManyRequests: 429,
  RequestHeaderFieldsTooLarge: 431,
  UnavailableForLegalReasons: 451,

  InternalServerError: 500,
  NotImplemented: 501,
  BadGateway: 502,
  ServiceUnavailable: 503,
  GatewayTimeout: 504,
  HTTPVersionNotSupported: 505,
  VariantAlsoNegotiates: 506,
  InsufficientStorage: 507,
  LoopDetected: 508,
  NotExtended: 510,
  NetworkAuthenticationRequired: 511,
} as const

export type StatusCode = typeof StatusCode[keyof typeof StatusCode]

export type ValidationError = Partial<ErrorObject>

export type FormattedError = {
  path: string
  message: string
}

export type AsyncHandlerResult = Promise<Response>
export type HandlerResult = Response | AsyncHandlerResult
export type NextFn = (data?: unknown) => HandlerResult

export type Middleware<T = void> = (
  req: Request<T>,
  res: unknown,
  next: NextFn,
) => HandlerResult

export type Handler<T = void> = (
  req: Request<T>,
  res: unknown,
) => HandlerResult

export type MiddlewareChain<T = void> = (Middleware<T> | Handler<T>)[]

export type CloseSignal = {
  code: number
  reason: string
}

export type SocketData<T = void> = {
  clientId: string
  superseded: boolean
  reaped: boolean
  reaperHandle: TimeoutHandle | null
  data: T
}

export const SessionType = {
  Active: 'active',
  Inactive: 'inactive',
} as const

export type SessionType = typeof SessionType[keyof typeof SessionType]

export const SessionFilter = {
  Active: 'active',
  Inactive: 'inactive',
  All: 'all',
} as const

export type SessionFilter = typeof SessionFilter[keyof typeof SessionFilter]

export type SessionEntry<T = void> = {
  clientId: string
  type: SessionType
  data: T
}

export type FilterFn<T = void> = (
  session: SessionEntry<T>,
  index: number,
) => boolean

export type SocketCommands<T = void> = {
  broadcast: (event: string, body: unknown) => void
  send: (event: string, body: unknown, fn: FilterFn<T>) => void
  drop: (signal: CloseSignal, fn: FilterFn<T>) => void
  query: (fn: FilterFn<T>, filter?: SessionFilter) => SessionEntry<T>[]
}

export type BaseRequest<T = void> = {
  method: HttpMethod
  route: string
  headers: Headers
  params: Record<string, string>
  query: Record<string, unknown>
  json: () => Promise<unknown>
  ws: SocketCommands<T>
}

export type EndpointRequest<T = void> = BaseRequest<T> & {
  raw: BunRequest
  server: Server<T>
}

export type WebSocketRequest<T = void> = BaseRequest<T> & {
  id: string
  clientId: string
}

export type Request<T = void> = EndpointRequest<T> | WebSocketRequest<T>

export type Server<T = void> = BunServer<SocketData<T>>

export function toSegments (pathString: string): string[] {
  const [pathname] = String(pathString).split('?')
  const segments = pathname.split('/')

  if (pathname.startsWith('/')) {
    segments.shift()
  }

  if (pathname.endsWith('/')) {
    segments.pop()
  }

  return segments
}

export function formatError (
  prefix: string,
  input: ValidationError,
): FormattedError {
  const fixedPath = input.instancePath || '/'
  const suffixPath = fixedPath.replace(/\//g, '.').replace('.', '')

  return {
    path: [prefix, suffixPath].filter(item => item).join('.'),
    message: input.message ?? '',
  }
}

export async function executeMiddlewareChain<T = void> (
  req: Request<T>,
  chain: MiddlewareChain<T>,
): AsyncHandlerResult {
  if (!chain.length) {
    throw new RangeError('Middleware chain is empty')
  }

  const executeMiddleware = async (
    index: number,
    res: unknown,
  ): AsyncHandlerResult => {
    const isLast = index === chain.length - 1
    const fn = chain[index]
    const next = (data?: unknown) => executeMiddleware(index + 1, data)

    const result = isLast
      ? await (fn as Handler<T>)(req, res)
      : await (fn as Middleware<T>)(req, res, next)

    if (result instanceof Response) {
      return result
    } else {
      throw new TypeError('Handler does not return a Response object')
    }
  }

  return executeMiddleware(0, null)
}
