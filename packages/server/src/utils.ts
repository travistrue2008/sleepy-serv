import type { ErrorObject } from 'ajv'
import type { BunRequest, Server as BunServer } from 'bun'

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

export type NextFn = (data?: unknown) => Response | Promise<Response>

export type BaseRequest = {
  method: HttpMethod
  route: string
  headers: Headers
  params: Record<string, string>
  query: Record<string, unknown>
  json: () => Promise<unknown>
}

export type EndpointRequest = BaseRequest & {
  raw: BunRequest
  server: Server
}

export type WebSocketRequest = BaseRequest & {
  id: string
  clientId: string
}

export type Request = EndpointRequest | WebSocketRequest

export type Middleware = (
  req: Request,
  res: unknown,
  next: NextFn | null,
) => unknown

export type SocketOptions = {
  disconnectThreshold?: number
  heartbeatInterval?: number
  maxTickets?: number
  reclaimTtl?: number
  ticketTtl?: number
}

export type SocketData = {
  clientId: string
  superseded: boolean
  reaped: boolean
  reaperHandle: ReturnType<typeof setTimeout> | null
}

export type Server = BunServer<SocketData>

export type AppOptions = {
  hostname?: string
  mountPath?: string
  middleware?: Middleware[]
  ws?: SocketOptions
  onClose?: () => Promise<void> | void
}

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

export async function executeMiddlewareChain (
  req: Request,
  chain: Middleware[],
): Promise<Response> {
  if (!chain.length) {
    throw new RangeError('Middleware chain is empty')
  }

  const executeMiddleware = async (
    index: number,
    res: unknown,
  ): Promise<Response> => {
    const currentMiddleware = chain[index]
    const isLastMiddleware = index === chain.length - 1

    const next = !isLastMiddleware ?
      (data?: unknown) => executeMiddleware(index + 1, data)
      : null

    const result = await currentMiddleware(req, res, next)

    if (result instanceof Response) {
      return result
    } else {
      throw new TypeError('Handler does not return a Response object')
    }
  }

  return executeMiddleware(0, null)
}
