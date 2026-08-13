import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import crypto from 'node:crypto'

import { MessageType, createMessage, validateMessage } from './messages'

import {
  StatusCode,
  toSegments,
  formatError,
  executeMiddlewareChain,
} from './utils'

import {
  RequestError,
  NotFoundError,
  UnauthorizedError,
  MethodNotAllowedError,
  UnprocessableContentError,
  InternalServerError,
  ServiceUnavailableError,
} from './errors'

import type { WebSocketHandler } from 'bun'
import type { ValidateFunction } from 'ajv'

import type {
  HttpMethod,
  Request,
  WebSocketRequest,
  Middleware,
  SocketData,
  AppOptions,
} from './utils'

import type {
  BaseMessage,
  RawMessage,
  RequestMessage,
  ResponseMessage,
} from './messages'

export type Ticket = {
  clientId: string
  expiresAt: number
}

export type SocketConnection = {
  data: SocketData
  send: (data: string) => unknown
  close: () => void
}

export type ActiveSession = {
  token: string
  ws: SocketConnection
}

export type InactiveSession = {
  token: string
  expiresAt: number
}

export type Session = ActiveSession | InactiveSession

export type SocketState = {
  disconnectThreshold: number
  heartbeatInterval: number
  maxTickets: number
  reclaimTtl: number
  ticketTtl: number
  tickets: Map<string, Ticket>
  activeSessions: Map<string, ActiveSession>
  inactiveSessions: Map<string, InactiveSession>
}

export type SocketRoute = {
  method: HttpMethod
  path: string
  segments: string[]
  chain: Middleware[]
}

export type SocketEndpoint = {
  method: HttpMethod
  path: string
  handler: (req: Request, res: unknown) => Response
}

export type SocketCommands = {
  send: (clientId: string, event: string, body: unknown) => void
  broadcast: (event: string, body: unknown) => void
}

type UpgradeData = {
  clientId?: string
  [key: string]: unknown
}

type UpgradeContext = {
  data?: UpgradeData
  [key: string]: unknown
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

function randomTicket (): string {
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
  const body = usingJson ? JSON.parse(text) : text

  return createMessage(clientId, MessageType.Response, {
    id,
    status: response.status,
    headers: response.headers,
    body,
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

export function buildSocketState (opts: AppOptions = {}): SocketState {
  return {
    disconnectThreshold: opts.ws?.disconnectThreshold ?? 120_000,
    heartbeatInterval: opts.ws?.heartbeatInterval ?? 30_000,
    maxTickets: opts.ws?.maxTickets ?? 100_000,
    reclaimTtl: opts.ws?.reclaimTtl ?? 300_000,
    ticketTtl: opts.ws?.ticketTtl ?? 10_000,
    tickets: new Map(),
    activeSessions: new Map(),
    inactiveSessions: new Map(),
  }
}

export function buildSocketServer (
  routes: SocketRoute[],
  state: SocketState,
): WebSocketHandler<SocketData> {
  const {
    disconnectThreshold,
    heartbeatInterval,
    reclaimTtl,
    activeSessions,
    inactiveSessions,
  } = state

  function armReaper (ws: SocketConnection): void {
    if (ws.data.reaperHandle) {
      clearTimeout(ws.data.reaperHandle)
    }

    ws.data.reaperHandle = setTimeout(() => {
      ws.data.reaped = true

      ws.close()
    }, disconnectThreshold)
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
    },
    close (ws: SocketConnection, code: number): void {
      if (ws.data.reaperHandle) {
        clearTimeout(ws.data.reaperHandle)
      }

      if (ws.data.superseded) {
        return
      }

      const existingSession = activeSessions.get(ws.data.clientId)

      if (!existingSession || existingSession.ws !== ws) {
        return
      }

      activeSessions.delete(ws.data.clientId)

      if (code !== 1000 || ws.data.reaped) {
        inactiveSessions.set(ws.data.clientId, {
          token: existingSession.token,
          expiresAt: Date.now() + reclaimTtl,
        })
      }
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
        const req = buildRequest(params, message)
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

  function bindTicket (clientId: string): string {
    for (const [key, entry] of tickets) {
      if (entry.expiresAt > Date.now()) {
        break
      }

      tickets.delete(key)
    }

    if (tickets.size >= maxTickets) {
      throw new ServiceUnavailableError('Unable to issue ticket')
    }

    const ticket = randomTicket()
    const expiresAt = Date.now() + ticketTtl

    tickets.set(ticket, {
      clientId,
      expiresAt,
    })

    return ticket
  }

  function redeemTicket (ticket: string): string | undefined {
    const entry = ticket ? tickets.get(ticket) : undefined

    if (!entry) {
      return undefined
    }

    tickets.delete(ticket)

    if (entry.expiresAt <= Date.now()) {
      return undefined
    }

    return entry.clientId
  }

  return [
    {
      method: 'GET',
      path: '/ws',
      handler (req: Record<string, unknown>, res: unknown): Response {
        const validReq = validateSchema(req, createSocketValidator)

        if (typeof res !== 'object') {
          throw new TypeError('Endpoint "res" must be an object')
        }

        const ctx: UpgradeContext = res ? { ...res } : {}

        ctx.data = ctx.data ?? {}
        ctx.data.clientId = redeemTicket(validReq.query.ticket)
        ctx.data.superseded = false
        ctx.data.reaped = false
        ctx.data.reaperHandle = null

        if (!ctx.data.clientId) {
          throw new NotFoundError()
        }

        const useSocket = validReq.server.upgrade(validReq.raw, ctx)

        if (!useSocket) {
          throw new NotFoundError()
        }

        return new Response()
      },
    },
    {
      method: 'POST',
      path: '/ws',
      handler (req: Record<string, unknown>, res: unknown): Response {
        validateSchema(req, createTicketValidator)

        const clientId = crypto.randomUUID()

        return Response.json({
          clientId,
          ticket: bindTicket(clientId),
          data: res,
        }, { status: StatusCode.Created })
      },
    },
    {
      method: 'PUT',
      path: '/ws/:clientId',
      handler (req: Record<string, unknown>, res: unknown): Response {
        const validReq = validateSchema(req, updateTicketValidator)
        const authHeader = validReq.headers.get('authorization')
        const token = authHeader!.slice('Bearer '.length)

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

        return Response.json({
          clientId: validReq.params.clientId,
          ticket: bindTicket(validReq.params.clientId),
          data: res,
        })
      },
    },
  ]
}

export function buildSocketCommands (state: SocketState): SocketCommands {
  function sendToClient (
    clientId: string,
    event: string,
    body: unknown,
  ): void {
    const session = state.activeSessions.get(clientId)

    if (!session) {
      throw new ReferenceError(`No live socket for client: ${clientId}`)
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
    broadcast (event, body) {
      for (const clientId of state.activeSessions.keys()) {
        sendToClient(clientId, event, body)
      }
    },
  }
}
