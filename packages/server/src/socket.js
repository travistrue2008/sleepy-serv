import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import crypto from 'node:crypto'

import { toSegments, formatError, executeMiddlewareChain } from './utils'
import { TYPES, createMessage, validateMessage } from './messages'

import {
  NotFoundError,
  UnauthorizedError,
  MethodNotAllowedError,
  InternalServerError,
  UnprocessableContentError,
} from './errors'

const ajv = new Ajv({
  allErrors: true,
})

addFormats(ajv)

const createSocketValidator = ajv.compile({
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

const createTicketValidator = ajv.compile({
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

const updateTicketValidator = ajv.compile({
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

function isSessionActive (session) {
  return !session.expiresAt || session.expiresAt > Date.now()
}

function randomToken (count) {
  return crypto.randomBytes(count).toString('base64url')
}

function parseMessage (raw) {
  try {
    return JSON.parse(raw)
  } catch (err) {
    console.error(err)

    return undefined
  }
}

function validateSchema (obj, validator) {
  const payload = {
    ...obj,
    headers: obj.headers ? Object.fromEntries(obj.headers) : undefined,
  }

  if (!validator(payload)) {
    const errors = validator.errors.map(item => formatError('', item))

    throw new UnprocessableContentError(errors)
  }
}

function matchesSegments (patternSegments, requestSegments) {
  if (patternSegments.length !== requestSegments.length) {
    return false
  }

  return patternSegments.every((segment, index) =>
    segment.startsWith(':') ||
    segment === requestSegments[index],
  )
}

function matchRoute (routes, message) {
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

function buildParams (route, message) {
  const requestSegments = toSegments(message.route)

  return route.segments.reduce((accum, segment, index) =>
    segment.startsWith(':') ? {
      ...accum,
      [segment.slice(1)]: requestSegments[index],
    } : accum, {})
}

function buildRequest (params, message) {
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

async function buildOutgoingMessage (id, clientId, response) {
  const text = await response.text()
  const contentType = response.headers.get('content-type') ?? ''
  const usingJson = contentType.includes('application/json')
  const body = usingJson ? JSON.parse(text) : text

  return createMessage(clientId, TYPES.RESPONSE, {
    id,
    status: response.status,
    headers: response.headers,
    body,
  })
}

export function buildSocketState (opts = {}) {
  return {
    disconnectThreshold: opts.ws?.disconnectThreshold ?? 120_000,
    heartbeatInterval: opts.ws?.heartbeatInterval ?? 30_000,
    reclaimTtl: opts.ws?.reclaimTtl ?? 300_000,
    ticketTtl: opts.ws?.ticketTtl ?? 10_000,
    sessions: new Map(),
    tickets: new Map(),
    sockets: new Map(),
  }
}

export function buildSocketServer (routes, state) {
  const {
    heartbeatInterval,
    disconnectThreshold,
    reclaimTtl,
    sessions,
    sockets,
  } = state

  function armReaper (ws) {
    clearTimeout(ws.data.reaperHandle)

    ws.data.reaperHandle = setTimeout(() => {
      ws.data.reaped = true

      ws.close()
    }, disconnectThreshold)
  }

  return {
    open (ws) {
      const { clientId } = ws.data
      const token = randomToken(32)
      const existingWs = sockets.get(clientId)

      if (existingWs && existingWs !== ws) {
        existingWs.data.superseded = true

        existingWs.close()
      }

      sessions.set(clientId, { token })
      sockets.set(clientId, ws)
      armReaper(ws)

      const welcomeMessage = createMessage(clientId, TYPES.WELCOME, {
        headers: {},
        body: {
          heartbeatInterval,
          token,
        },
      })

      ws.send(JSON.stringify(welcomeMessage))
    },
    close (ws, code) {
      clearTimeout(ws.data.reaperHandle)

      if (ws.data.superseded) {
        return
      }

      const existingWs = sockets.get(ws.data.clientId)

      if (existingWs === ws) {
        sockets.delete(ws.data.clientId)
      }

      if (code === 1000 && !ws.data.reaped) {
        sessions.delete(ws.data.clientId)

        return
      }

      const session = sessions.get(ws.data.clientId)

      if (session) {
        session.expiresAt = Date.now() + reclaimTtl
      }
    },
    async message (ws, raw) {
      const incomingMsg = parseMessage(raw)

      if (incomingMsg === undefined) {
        return
      }

      armReaper(ws)

      try {
        validateMessage(incomingMsg)

        if (incomingMsg.type === TYPES.HEARTBEAT) {
          const { id, clientId } = incomingMsg
          const ack = createMessage(clientId, TYPES.HEARTBEAT, { id })

          ws.send(JSON.stringify(ack))

          return
        }

        const { id, clientId } = incomingMsg
        const route = matchRoute(routes, incomingMsg)
        const params = buildParams(route, incomingMsg)
        const req = buildRequest(params, incomingMsg)
        const res = await executeMiddlewareChain(req, route.chain)
        const outgoingMsg = await buildOutgoingMessage(id, clientId, res)

        ws.send(JSON.stringify(outgoingMsg))
      } catch (err) {
        console.error(err)

        const { id, clientId } = incomingMsg
        const status = err.constructor.status ?? InternalServerError.status
        const body = err.output !== undefined ? err.output : err.message

        const headers = err.output !== undefined
          ? { 'content-type': 'application/json;charset=utf-8' }
          : {}

        const res = createMessage(clientId, TYPES.RESPONSE, {
          id,
          status,
          headers,
          body,
        })

        ws.send(JSON.stringify(res))
      }
    },
  }
}

export function buildSocketHandlers (state) {
  const { ticketTtl, tickets, sessions } = state

  function bindTicket (clientId) {
    const ticket = randomToken(24)
    const expiresAt = Date.now() + ticketTtl

    tickets.set(ticket, {
      clientId,
      expiresAt,
    })

    return ticket
  }

  function redeemTicket (ticket) {
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
      handler (req) {
        validateSchema(req, createSocketValidator)

        const clientId = redeemTicket(req.query.ticket)

        if (!clientId) {
          throw new NotFoundError()
        }

        const useSocket = req.server.upgrade(req.raw, {
          data: {
            clientId,
          },
        })

        if (!useSocket) {
          throw new NotFoundError()
        }

        return new Response()
      },
    },
    {
      method: 'POST',
      path: '/ws',
      handler (req) {
        validateSchema(req, createTicketValidator)

        const clientId = crypto.randomUUID()

        return Response.json({
          clientId,
          ticket: bindTicket(clientId),
        })
      },
    },
    {
      method: 'PUT',
      path: '/ws/:clientId',
      handler (req) {
        validateSchema(req, updateTicketValidator)

        const authHeader = req.headers.get('authorization')
        const token = authHeader.slice('Bearer '.length)
        const session = sessions.get(req.params.clientId)

        if (session && !isSessionActive(session)) {
          sessions.delete(req.params.clientId)
        }

        if (!session || !isSessionActive(session)) {
          throw new NotFoundError()
        }

        if (session.token !== token) {
          throw new UnauthorizedError()
        }

        return Response.json({
          clientId: req.params.clientId,
          ticket: bindTicket(req.params.clientId),
        })
      },
    },
  ]
}

export function buildSocketCommands (state) {
  function sendToClient (clientId, event, body) {
    const ws = state.sockets.get(clientId)

    if (!ws) {
      throw new ReferenceError(`No live socket for client: ${clientId}`)
    }

    const message = createMessage(clientId, TYPES.NOTIFICATION, {
      event,
      headers: {},
      body,
    })

    ws.send(JSON.stringify(message))
  }

  return {
    send (clientId, event, body) {
      sendToClient(clientId, event, body)
    },
    broadcast (event, body) {
      for (const clientId of state.sockets.keys()) {
        sendToClient(clientId, event, body)
      }
    },
  }
}
