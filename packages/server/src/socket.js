import { executeMiddlewareChain } from './utils'
import { TYPES, createMessage, validateMessage } from './messages'

import {
  NotFoundError,
  MethodNotAllowedError,
  InternalServerError,
} from './errors'

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

export function createSocketHandler (routes, opts = {}) {
  const sockets = {}
  const heartbeatInterval = opts.ws?.heartbeatInterval ?? 30_000
  const disconnectThreshold = opts.ws?.disconnectThreshold ?? 120_000

  function armReaper (ws) {
    clearTimeout(ws.data.reaperHandle)

    ws.data.reaperHandle = setTimeout(() => ws.close(), disconnectThreshold)
  }

  return {
    open (ws) {
      sockets[ws.data.clientId] = ws

      armReaper(ws)

      const welcomeMessage = createMessage(ws.data.clientId, TYPES.WELCOME, {
        headers: {},
        body: {
          clientId: ws.data.clientId,
          heartbeatInterval,
        },
      })

      ws.send(JSON.stringify(welcomeMessage))
    },

    close (ws) {
      clearTimeout(ws.data.reaperHandle)

      delete sockets[ws.data.clientId]
    },

    async message (ws, raw) {
      const incomingMessage = parseMessage(raw)

      if (incomingMessage === undefined) {
        return
      }

      armReaper(ws)

      try {
        validateMessage(incomingMessage)

        if (incomingMessage.type === TYPES.HEARTBEAT) {
          return
        }

        const { id, clientId } = incomingMessage
        const { middlewareChain, params } = matchRoute(routes, incomingMessage)
        const req = buildRequest(incomingMessage, params)
        const res = await executeMiddlewareChain(req, {}, middlewareChain)
        const outgoingMessage = await buildOutgoingMessage(id, clientId, res)

        ws.send(JSON.stringify(outgoingMessage))
      } catch (err) {
        console.error(err)

        const { id, clientId } = incomingMessage
        const status = err.constructor.status ?? InternalServerError.status
        const body = err.output !== undefined ? err.output : err.message

        const res = createMessage(clientId, TYPES.RESPONSE, {
          id,
          status,
          headers: {},
          body,
        })

        ws.send(JSON.stringify(res))
      }
    },
  }
}
