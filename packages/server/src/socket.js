import crypto from 'node:crypto'

import { executeMiddlewareChain } from './utils'
import { TYPES, createMessage, validateMessage } from './messages'

import {
  NotFoundError,
  UnauthorizedError,
  MethodNotAllowedError,
  InternalServerError,
} from './errors'

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

function toSegments (pathString) {
  const [pathname] = String(pathString).split('?')
  const segments = pathname.split('/').slice(1)

  if (segments.length === 1 && !segments[0]) {
    segments.pop()
  }

  return segments
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

function buildParams (patternSegments, requestSegments) {
  return patternSegments.reduce((accum, segment, index) =>
    segment.startsWith(':') ? {
      ...accum,
      [segment.slice(1)]: requestSegments[index],
    } : accum, {})
}

function matchRoute (routes, message) {
  const requestSegments = toSegments(message.route)

  const matchingPaths = routes.filter(route =>
    matchesSegments(route.patternSegments, requestSegments),
  )

  if (!matchingPaths.length) {
    throw new NotFoundError()
  }

  const target = matchingPaths.find(route => route.method === message.method)

  if (!target) {
    throw new MethodNotAllowedError()
  }

  return {
    middlewareChain: target.middlewareChain,
    params: buildParams(target.patternSegments, requestSegments),
  }
}

function buildRequest (message, params) {
  return {
    id: message.id,
    method: message.method,
    route: message.route,
    timestamp: message.timestamp,
    params,
    query: message.query ?? {},
    headers: new Headers(message.headers ?? {}),
    body: message.body,
    json: async () => message.body,
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

export function buildSocketRoutes (moduleRoutes) {
  return moduleRoutes.map(route => ({
    method: route.method,
    patternSegments: toSegments(route.path),
    middlewareChain: route.middlewareChain,
  }))
}

export function buildSocketHandlers (routes, opts = {}) {
  const sockets = {}
  const sessions = new Map()
  const tickets = new Map()
  const heartbeatInterval = opts.ws?.heartbeatInterval ?? 30_000
  const disconnectThreshold = opts.ws?.disconnectThreshold ?? 120_000
  const reclaimTtl = opts.ws?.reclaimTtl ?? 300_000
  const ticketTtl = opts.ws?.ticketTtl ?? 10_000

  function armReaper (ws) {
    clearTimeout(ws.data.reaperHandle)

    ws.data.reaperHandle = setTimeout(() => {
      ws.data.reaped = true

      ws.close()
    }, disconnectThreshold)
  }

  function sessionActive (session) {
    return !session.expiresAt || session.expiresAt > Date.now()
  }

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

  return {
    endpoints: {
      '/ws': {
        'GET': (req, server) => {
          const ticket = new URL(req.url).searchParams.get('ticket')
          const clientId = redeemTicket(ticket)

          if (!clientId) {
            throw new NotFoundError()
          }

          const useSocket = server.upgrade(req, {
            data: {
              clientId,
            },
          })

          if (!useSocket) {
            throw new NotFoundError()
          }

          return new Response()
        },
        'POST': () => {
          const clientId = crypto.randomUUID()

          return Response.json({
            clientId,
            ticket: bindTicket(clientId),
          })
        },
      },
      '/ws/:clientId': {
        'PUT': req => {
          const header = req.headers.get('authorization')

          const token = header?.startsWith('Bearer ')
            ? header.slice('Bearer '.length)
            : undefined

          const session = sessions.get(req.params.clientId)

          if (session && !sessionActive(session)) {
            sessions.delete(req.params.clientId)
          }

          if (!session || !sessionActive(session)) {
            throw new NotFoundError()
          }

          if (session.token !== token) {
            throw new UnauthorizedError()
          }

          return Response.json({
            clientId: req.params.clientId,
            ticket: bindTicket(req.params.clientId),
          },
          )
        },
      },
    },
    server: {
      open (ws) {
        const { clientId } = ws.data
        const token = randomToken(32)
        const existing = sockets[clientId]

        if (existing && existing !== ws) {
          existing.data.superseded = true

          existing.close()
        }

        sessions.set(clientId, { token })
        sockets[clientId] = ws

        armReaper(ws)

        const welcomeMessage = createMessage(clientId, TYPES.WELCOME, {
          headers: {},
          body: {
            token,
            heartbeatInterval,
          },
        })

        ws.send(JSON.stringify(welcomeMessage))
      },
      close (ws, code) {
        clearTimeout(ws.data.reaperHandle)

        if (ws.data.superseded) {
          return
        }

        const { clientId } = ws.data

        if (sockets[clientId] === ws) {
          delete sockets[clientId]
        }

        if (code === 1000 && !ws.data.reaped) {
          sessions.delete(clientId)

          return
        }

        const session = sessions.get(clientId)

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
          const { middlewareChain, params } = matchRoute(routes, incomingMsg)
          const req = buildRequest(incomingMsg, params)
          const res = await executeMiddlewareChain(req, {}, middlewareChain)
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
    },
  }
}
