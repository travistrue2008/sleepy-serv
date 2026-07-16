import crypto from 'node:crypto'
import { TYPES } from '../src/messages'

export const FMT = {
  NONE: 'none',
  TEXT: 'text',
  JSON: 'json',
}

async function deserializeBody (fmt, res) {
  const methodName = fmt ?? 'json'
  const body = await res[methodName]()

  return body
}

async function makeRequestMethod (app, method, route, fmt, opts = {}) {
  const query = new URLSearchParams(opts.query ?? {}).toString()
  const mountPath = opts.mountPath ?? ''
  const suffix = query ? `?${query}` : ''
  const url = `${app.server.url.origin}${mountPath}${route}${suffix}`

  const res = await fetch(url, {
    method,
    headers: opts.headers ?? new Headers(),
    body: opts.body ?? undefined /* no-op for clarity */,
  })

  return {
    status: res.status,
    body: await deserializeBody(fmt, res),
  }
}

export function createRequestor (app) {
  return {
    get (route, fmt, opts) {
      return makeRequestMethod(app, 'GET', route, fmt, opts)
    },
    put (route, fmt, opts = {}) {
      return makeRequestMethod(app, 'PUT', route, fmt, opts)
    },
    post (route, fmt, opts = {}) {
      return makeRequestMethod(app, 'POST', route, fmt, opts)
    },
  }
}

export async function createSocketClient (app, opts = {}) {
  const mountPath = opts.mountPath ?? ''
  const hostRoot = `${app.server.url.host}${mountPath}/ws`
  const req = createRequestor(app)
  const res = await req.post('/ws', FMT.JSON, { mountPath })
  const url = `ws://${hostRoot}?ticket=${res.body.ticket}`
  const socket = new WebSocket(url)

  const data = await new Promise((resolve, reject) => {
    socket.addEventListener('error', event => {
      console.error(event)
      reject(event)
    })

    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data)

      if (message.type !== TYPES.WELCOME) {
        return reject(
          new TypeError(
            `Expected ${TYPES.WELCOME} message, but got: '${message.type}'`,
          ),
        )
      }

      resolve({
        clientId: message.clientId,
        token: message.body.token,
        heartbeatInterval: message.body.heartbeatInterval,
      })
    })
  })

  async function sendRaw (payload) {
    return new Promise(resolve => {
      const handler = event => {
        resolve(JSON.parse(event.data))

        socket.removeEventListener('message', handler)
      }

      socket.addEventListener('message', handler)
      socket.send(JSON.stringify(payload))
    })
  }

  async function sendMessage (type, payload) {
    return new Promise(resolve => {
      const handler = event => {
        resolve(JSON.parse(event.data))

        socket.removeEventListener('message', handler)
      }

      socket.addEventListener('message', handler)

      sendRaw({
        ...payload,
        id: crypto.randomUUID(),
        clientId: data.clientId,
        type,
        timestamp: new Date().toISOString(),
      }).then(resolve)
    })
  }

  async function sendRequest (method, route, payload) {
    const message = await sendMessage(TYPES.REQUEST, {
      method,
      route,
      headers: payload.headers ?? {},
      query: payload.query ?? {},
      body: payload.body ?? {},
    })

    return message
  }

  return {
    get clientId () {
      return data.clientId
    },
    get token () {
      return data.token
    },
    get heartbeatInterval () {
      return data.heartbeatInterval
    },
    get socket () {
      return socket
    },
    async close () {
      await socket.close()
    },
    heartbeat () {
      return sendMessage(TYPES.HEARTBEAT, {})
    },
    get (route, opts = {}) {
      return sendRequest('GET', route, opts)
    },
    put (route, opts = {}) {
      return sendRequest('PUT', route, opts)
    },
    post (route, opts = {}) {
      return sendRequest('POST', route, opts)
    },
    sendRaw (payload) {
      return sendRaw(payload)
    },
  }
}
