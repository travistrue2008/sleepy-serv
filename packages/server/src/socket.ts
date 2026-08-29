import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import crypto from 'node:crypto'

import {
  MessageType,
  createMessage,
  validateMessage,
} from './messages'

import {
  StatusCode,
  CloseCode,
  CloseReason,
  toSegments,
  formatError,
  executeMiddlewareChain,
} from './utils'

import {
  RequestError,
  BadRequestError,
  NotFoundError,
  UnauthorizedError,
  MethodNotAllowedError,
  UnprocessableContentError,
  InternalServerError,
  ServiceUnavailableError,
} from './errors'

import type { ValidateFunction } from 'ajv'
import type { WebSocketHandler } from 'bun'

import type {
  AsyncHandlerResult,
  HttpMethod,
  Request,
  MiddlewareChain,
  WebSocketRequest,
  SocketData,
  SocketConnection,
  ActiveSession,
  ActiveSessions,
  InactiveSession,
  Session,
  AppOptions,
} from './utils'

import type {
  BaseMessage,
  RawMessage,
  RequestMessage,
  ResponseMessage,
} from './messages'

type SocketHandler = (req: Request, res: unknown) => AsyncHandlerResult
type FilterFn = (clientId: string, data: unknown) => boolean

type UpgradeData = {
  clientId?: string
  [key: string]: unknown
}

type UpgradeContext = {
  data?: UpgradeData
  [key: string]: unknown
}

type SocketEndpoint = {
  method: HttpMethod
  path: string
  handler: SocketHandler
}

type CreateSocketRequest = {
  query: {
    ticket: string
  }
  server: {
    upgrade: (raw: unknown, ctx: UpgradeContext) => boolean
  }
  raw: unknown
}

type CreateTicketRequest = Record<string, unknown>

type UpdateTicketRequest = {
  headers: Headers
  params: {
    clientId: string
  }
}

export type Ticket = {
  clientId: string
  expiresAt: number
  data: unknown
}

export type SocketState = {
  dropThreshold: number
  heartbeatInterval: number
  maxTickets: number
  reclaimTtl: number
  ticketTtl: number
  tickets: Map<string, Ticket>
  activeSessions: Map<string, ActiveSession>
  inactiveSessions: Map<string, InactiveSession>
  onOpen: ((clientId: string) => void) | null
  onClose: ((clientId: string, reason: CloseReason) => void) | null
}

export type SocketRoute = {
  method: HttpMethod
  path: string
  segments: string[]
  chain: MiddlewareChain
}

export type SocketCommands = {
  send: (clientId: string, event: string, body: unknown) => void
  sendToGroup: (fn: FilterFn, event: string, body: unknown) => void
  broadcast: (event: string, body: unknown) => void
  drop: (clientId: string, code?: number, reason?: string) => void
}

const ajv = new Ajv({
  allErrors: true,
})

addFormats(ajv)

const validateNotMessage = ajv.compile({
  type: 'object',
  properties: {
    clientId: {
      type: 'string',
    },
  },
  not: {
    required: ['clientId'],
  },
})

const createSocketValidator = ajv.compile<CreateSocketRequest>({
  type: 'object',
  properties: {
    clientId: {
      type: 'string',
    },
    query: {
      type: 'object',
      properties: {
        ticket: {
          type: 'string',
        },
      },
      required: ['ticket'],
    },
    server: {
      type: 'object',
      properties: {
        upgrade: {},
      },
      required: ['upgrade'],
    },
    raw: {
      type: 'object',
    },
  },
  required: [
    'query',
    'server',
    'raw',
  ],
  not: {
    required: ['clientId'],
  },
})

const createTicketValidator = ajv.compile<CreateTicketRequest>({
  type: 'object',
  properties: {
    clientId: {
      type: 'string',
    },
  },
  not: {
    required: ['clientId'],
  },
})

const updateTicketValidator = ajv.compile<UpdateTicketRequest>({
  type: 'object',
  properties: {
    clientId: {
      type: 'string',
    },
    params: {
      type: 'object',
      properties: {
        clientId: {
          type: 'string',
        },
      },
      required: ['clientId'],
    },
    headers: {
      type: 'object',
      properties: {
        authorization: {
          type: 'string',
          pattern: '^Bearer .+$',
        },
      },
      required: ['authorization'],
    },
  },
  required: [
    'params',
    'headers',
  ],
  not: {
    required: ['clientId'],
  },
})

function isSessionActive (session: InactiveSession): boolean {
  return !session.expiresAt || session.expiresAt > Date.now()
}

function randomTicketHash (): string {
  return crypto.randomBytes(24).toString('base64url')
}

function randomToken (): string {
  return crypto.randomBytes(32).toString('base64url')
}

function parseMessage (raw: string | Buffer): RawMessage | undefined {
  try {
    return JSON.parse(String(raw))
  } catch (err) {
    console.error(err)

    return undefined
  }
}

async function parseJsonBody (req: Request): Promise<unknown> {
  try {
    const body = await req.json()

    return body
  } catch {
    throw new BadRequestError('Invalid JSON')
  }
}

async function parseJsonBodyAppData (req: Request): Promise<unknown> {
  const contentType = req.headers.get('content-type')
  const usingJsonBody = contentType?.startsWith('application/json')

  if (!usingJsonBody) {
    return null
  }

  const rawBody = await parseJsonBody(req)
  const appData = (rawBody as Record<string, unknown> | null)?.data ?? null

  return appData
}

function sweepInactiveSessions (state: SocketState): void {
  for (const [key, session] of state.inactiveSessions) {
    if (!isSessionActive(session)) {
      state.inactiveSessions.delete(key)
    }
  }
}

function validateSchema<T extends Record<string, unknown>> (
  obj: Record<string, unknown>,
  validator: ValidateFunction<T>,
): T {
  const headers = obj.headers instanceof Headers
    ? Object.fromEntries(obj.headers)
    : undefined

  const payload = {
    ...obj,
    headers,
  }

  if (!validateNotMessage(payload)) {
    const errors = validateNotMessage.errors!.map(item => formatError('', item))

    throw new UnprocessableContentError(errors)
  }

  if (!validator(payload)) {
    const errors = validator.errors!.map(item => formatError('', item))

    throw new UnprocessableContentError(errors)
  }

  return obj as T
}

function matchesSegments (
  patternSegments: string[],
  requestSegments: string[],
): boolean {
  if (patternSegments.length !== requestSegments.length) {
    return false
  }

  return patternSegments.every((segment, index) =>
    segment.startsWith(':') ||
    segment === requestSegments[index],
  )
}

function matchRoute (
  routes: SocketRoute[],
  message: RequestMessage,
): SocketRoute {
  const requestSegments = toSegments(message.route)

  const matchingPaths = routes.filter(route =>
    matchesSegments(route.segments, requestSegments),
  )

  if (!matchingPaths.length) {
    throw new NotFoundError()
  }

  const route = matchingPaths.find(route => route.method === message.method)

  if (!route) {
    throw new MethodNotAllowedError()
  }

  return route
}

function buildParams (
  route: SocketRoute,
  message: RequestMessage,
): Record<string, string> {
  const requestSegments = toSegments(message.route)

  return route.segments.reduce<Record<string, string>>(
    (accum, segment, index) =>
      segment.startsWith(':') ? {
        ...accum,
        [segment.slice(1)]: requestSegments[index],
      } : accum, {})
}

function buildRequest (
  params: Record<string, string>,
  message: RequestMessage,
  activeSessions: ActiveSessions,
): WebSocketRequest {
  const { id, clientId, method, route } = message
  const headers = new Headers(message.headers ?? {})
  const query = message.query ?? {}
  const json = async () => message.body

  return {
    id,
    clientId,
    method,
    route,
    headers,
    params,
    query,
    json,
    ws: {
      active: activeSessions,
    },
  }
}

async function buildOutgoingMessage (
  id: string,
  clientId: string,
  response: Response,
): Promise<ResponseMessage> {
  const text = await response.text()
  const contentType = response.headers.get('content-type') ?? ''
  const usingJson = contentType.includes('application/json')

  return createMessage(clientId, MessageType.Response, {
    id,
    status: response.status,
    headers: response.headers,
    body: usingJson ? JSON.parse(text) : text,
  })
}

function buildErrorMessage (
  message: RawMessage,
  err: unknown,
): ResponseMessage {
  const { id, clientId } = message as Pick<BaseMessage, 'id' | 'clientId'>
  const isRequestError = err instanceof RequestError
  const httpError = isRequestError ? err : new InternalServerError()
  const { status } = httpError.constructor as typeof RequestError

  return createMessage(clientId, MessageType.Response, {
    id,
    status,
    headers: new Headers({
      'content-type': 'application/json;charset=utf-8',
    }),
    body: httpError.output,
  })
}

function getCloseReason (ws: SocketConnection, code: number): CloseReason {
  if (ws.data.reaped) {
    return CloseReason.Reaped
  } else if (code === CloseCode.Normal) {
    return CloseReason.Ok
  }

  return CloseReason.Dropped
}

export function buildSocketState (opts: AppOptions = {}): SocketState {
  return {
    dropThreshold: opts.ws?.dropThreshold ?? 120_000,
    heartbeatInterval: opts.ws?.heartbeatInterval ?? 30_000,
    maxTickets: opts.ws?.maxTickets ?? 100_000,
    reclaimTtl: opts.ws?.reclaimTtl ?? 300_000,
    ticketTtl: opts.ws?.ticketTtl ?? 10_000,
    tickets: new Map(),
    activeSessions: new Map(),
    inactiveSessions: new Map(),
    onOpen: opts.ws?.onOpen ?? null,
    onClose: opts.ws?.onClose ?? null,
  }
}

export function buildSocketServer (
  routes: SocketRoute[],
  state: SocketState,
): WebSocketHandler<SocketData> {
  const {
    dropThreshold,
    heartbeatInterval,
    reclaimTtl,
    activeSessions,
    inactiveSessions,
    onOpen,
    onClose,
  } = state

  function armReaper (ws: SocketConnection) {
    if (ws.data.reaperHandle) {
      clearTimeout(ws.data.reaperHandle)
    }

    ws.data.reaperHandle = setTimeout(() => {
      ws.data.reaped = true

      ws.close(CloseCode.Reaped)
    }, dropThreshold)
  }

  function invokeOpen (ws: SocketConnection) {
    if (onOpen) {
      try {
        onOpen(ws.data.clientId)
      } catch (err) {
        console.error(err)
      }
    }
  }

  function invokeClose (ws: SocketConnection, reason: CloseReason) {
    if (onClose) {
      try {
        onClose(ws.data.clientId, reason)
      } catch (err) {
        console.error(err)
      }
    }
  }

  return {
    open (ws: SocketConnection): void {
      sweepInactiveSessions(state)

      const token = randomToken()
      const existingSession = activeSessions.get(ws.data.clientId)

      if (existingSession) {
        existingSession.ws.data.superseded = true

        existingSession.ws.close()
      }

      inactiveSessions.delete(ws.data.clientId)

      activeSessions.set(ws.data.clientId, {
        token,
        ws,
      })

      armReaper(ws)

      const welcomeMessage = createMessage(
        ws.data.clientId,
        MessageType.Welcome,
        {
          headers: new Headers(),
          body: {
            heartbeatInterval,
            token,
          },
        },
      )

      ws.send(JSON.stringify(welcomeMessage))
      invokeOpen(ws)
    },
    close (ws: SocketConnection, code: number): void {
      if (ws.data.reaperHandle) {
        clearTimeout(ws.data.reaperHandle)
      }

      if (ws.data.superseded) {
        invokeClose(ws, CloseReason.Superseded)

        return
      }

      const reason = getCloseReason(ws, code)
      const exists = activeSessions.get(ws.data.clientId)

      if (!exists || exists.ws !== ws) {
        return
      }

      activeSessions.delete(ws.data.clientId)

      if (code !== CloseCode.Normal || ws.data.reaped) {
        inactiveSessions.set(ws.data.clientId, {
          token: exists.token,
          expiresAt: Date.now() + reclaimTtl,
          app: ws.data.app,
        })
      }

      invokeClose(ws, reason)
    },
    async message (ws: SocketConnection, raw: string | Buffer): Promise<void> {
      const incomingMsg = parseMessage(raw)

      if (incomingMsg === undefined) {
        return
      }

      armReaper(ws)

      try {
        const message = validateMessage(incomingMsg)

        if (message.type === MessageType.Heartbeat) {
          const { id, clientId } = message
          const ack = createMessage(clientId, MessageType.Heartbeat, { id })

          ws.send(JSON.stringify(ack))

          return
        }

        const { id, clientId } = message
        const route = matchRoute(routes, message)
        const params = buildParams(route, message)
        const req = buildRequest(params, message, activeSessions)
        const res = await executeMiddlewareChain(req, route.chain)
        const outgoingMsg = await buildOutgoingMessage(id, clientId, res)

        ws.send(JSON.stringify(outgoingMsg))
      } catch (err) {
        console.error(err)

        const res = buildErrorMessage(incomingMsg, err)

        ws.send(JSON.stringify(res))
      }
    },
  }
}

export function buildSocketHandlers (state: SocketState): SocketEndpoint[] {
  const {
    maxTickets,
    ticketTtl,
    tickets,
    activeSessions,
    inactiveSessions,
  } = state

  function issueTicket (clientId: string, data: unknown): string {
    for (const [key, entry] of tickets) {
      if (entry.expiresAt > Date.now()) {
        break
      }

      tickets.delete(key)
    }

    if (tickets.size >= maxTickets) {
      throw new ServiceUnavailableError('Unable to issue ticket')
    }

    const hash = randomTicketHash()
    const expiresAt = Date.now() + ticketTtl

    tickets.set(hash, {
      clientId,
      expiresAt,
      data,
    })

    return hash
  }

  function redeemTicket (hash: string): Ticket | undefined {
    const entry = hash ? tickets.get(hash) : undefined

    if (!entry) {
      return undefined
    }

    tickets.delete(hash)

    return entry.expiresAt > Date.now() ? entry : undefined

  }

  return [
    {
      method: 'GET',
      path: '/ws',
      handler (req: Request, res: unknown): AsyncHandlerResult {
        const validReq = validateSchema(req, createSocketValidator)

        if (typeof res !== 'object') {
          throw new TypeError('Endpoint "res" must be an object')
        }

        const ctx: UpgradeContext = res ? { ...res } : {}
        const ticket = redeemTicket(validReq.query.ticket)

        if (!ticket) {
          throw new NotFoundError()
        }

        ctx.data = ctx.data ?? {}
        ctx.data.clientId = ticket.clientId
        ctx.data.superseded = false
        ctx.data.reaped = false
        ctx.data.reaperHandle = null
        ctx.data.app = ticket.data

        const useSocket = validReq.server.upgrade(validReq.raw, ctx)

        if (!useSocket) {
          throw new NotFoundError()
        }

        return Promise.resolve(new Response())
      },
    },
    {
      method: 'POST',
      path: '/ws',
      async handler (req: Request, res: unknown): AsyncHandlerResult {
        validateSchema(req, createTicketValidator)

        const clientId = crypto.randomUUID()
        const appData = await parseJsonBodyAppData(req)
        const ticket = issueTicket(clientId, appData)

        return Response.json({
          clientId,
          ticket,
          data: res,
        }, { status: StatusCode.Created })
      },
    },
    {
      method: 'PUT',
      path: '/ws/:clientId',
      async handler (req: Request, res: unknown): AsyncHandlerResult {
        const validReq = validateSchema(req, updateTicketValidator)
        const authHeader = validReq.headers.get('authorization')!
        const token = authHeader.slice('Bearer '.length)

        let session: Session | undefined =
          activeSessions.get(validReq.params.clientId)

        if (!session) {
          const inactive = inactiveSessions.get(validReq.params.clientId)

          if (inactive && !isSessionActive(inactive)) {
            inactiveSessions.delete(validReq.params.clientId)
          } else {
            session = inactive
          }
        }

        if (!session) {
          throw new NotFoundError()
        }

        if (session.token !== token) {
          throw new UnauthorizedError('Invalid token')
        }

        const appData = 'ws' in session ? session.ws.data.app : session.app

        return Response.json({
          clientId: validReq.params.clientId,
          ticket: issueTicket(validReq.params.clientId, appData),
          data: res,
        })
      },
    },
  ]
}

export function buildSocketCommands (state: SocketState): SocketCommands {
  function sendToClient (clientId: string, event: string, body: unknown) {
    const session = state.activeSessions.get(clientId)

    if (!session) {
      throw new ReferenceError(`No active socket for client: ${clientId}`)
    }

    const message = createMessage(clientId, MessageType.Notification, {
      event,
      headers: new Headers(),
      body,
    })

    session.ws.send(JSON.stringify(message))
  }

  return {
    send (clientId, event, body) {
      sendToClient(clientId, event, body)
    },
    sendToGroup (fn, event, body) {
      for (const [clientId, session] of state.activeSessions) {
        const allow = fn(clientId, session.ws.data)

        if (allow) {
          sendToClient(clientId, event, body)
        }
      }
    },
    broadcast (event, body) {
      for (const clientId of state.activeSessions.keys()) {
        sendToClient(clientId, event, body)
      }
    },
    drop (clientId, code, reason) {
      const session = state.activeSessions.get(clientId)

      if (!session) {
        throw new ReferenceError(`No active socket for client: ${clientId}`)
      }

      session.ws.close(code, reason)
    },
  }
}
