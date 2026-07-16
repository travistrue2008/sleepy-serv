import crypto from 'node:crypto'
import { TYPES } from '../src/messages'
import { createApp } from '../src'

export const FMT = {
  NONE: 'none',
  TEXT: 'text',
  JSON: 'json',
}

export class Context {
  #clientId = null
  #app = null
  #socket = null

  static async #createSocket (ctx, mountPath) {
    const domain = `localhost:${ctx.port}${mountPath}/ws`

    const response = await fetch(`http://${domain}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json;charset=utf-8',
      },
      body: JSON.stringify({}),
    })

    const { ticket } = await response.json()

    ctx.#socket = new WebSocket(`ws://${domain}?ticket=${ticket}`)
  }

  static async #waitForSocketOpen (ctx) {
    await new Promise((resolve, reject) => {
      ctx.#socket.addEventListener('error', event => {
        console.error(event)
        reject(event)
      })

      ctx.#socket.addEventListener('message', event => {
        const message = JSON.parse(event.data)

        if (message.type !== TYPES.WELCOME) {
          return
        }

        ctx.#clientId = message.clientId

        resolve()
      })
    })
  }

  static async create (dirname, opts = {}) {
    const ctx = new this()

    ctx.#app = await createApp(0, dirname, opts)

    if (!opts.hostname) {
      await this.#createSocket(ctx, opts.mountPath || '')
      await this.#waitForSocketOpen(ctx)
    }

    return ctx
  }

  get port () {
    return this.#app.server.port
  }

  get app () {
    return this.#app
  }

  get socket () {
    return this.#socket
  }

  async #parseBody (response, fmt) {
    switch (fmt) {
      case FMT.NONE:
        return null

      case FMT.TEXT:
        return response.text()

      case FMT.JSON:
        return response.json()

      default:
        throw new RangeError(`Invalid format: ${fmt}`)
    }
  }

  async shutdown () {
    if (this.#socket) {
      await this.#socket.close()
    }

    await this.#app.server.stop(true)
  }

  async makeRequest (route, fmt, opts = {}) {
    const baseUrl = `http://localhost:${this.port}`
    const url = new URL(route, baseUrl)
    const search = new URLSearchParams(opts.query ?? {})

    url.search = search

    const method = opts.method ?? 'GET'
    const res = await fetch(url.toString(), { method })
    const body = await this.#parseBody(res, fmt)

    return {
      status: res.status,
      body,
    }
  }

  async sendMessage (method, route, payload = {}) {
    return new Promise(resolve => {
      const message = JSON.stringify({
        id: crypto.randomUUID(),
        clientId: this.#clientId,
        type: TYPES.REQUEST,
        method,
        route,
        timestamp: new Date().toISOString(),
        headers: payload.headers ?? {},
        query: payload.query ?? {},
        body: payload.body ?? {},
      })

      const handler = event => {
        resolve(JSON.parse(event.data))

        this.#socket.removeEventListener('message', handler)
      }

      this.#socket.addEventListener('message', handler)
      this.#socket.send(message)
    })
  }

  async sendMessageRaw (payload) {
    return new Promise(resolve => {
      const handler = event => {
        const data = JSON.parse(event.data)

        resolve(data)

        this.#socket.removeEventListener('message', handler)
      }

      this.#socket.addEventListener('message', handler)

      this.#socket.send(JSON.stringify(payload))
    })
  }
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
  const res = await req.post('/ws', FMT.JSON, {}, { mountPath })
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

  async function sendMessage (type, payload) {
    return new Promise(resolve => {
      const handler = event => {
        resolve(JSON.parse(event.data))

        socket.removeEventListener('message', handler)
      }

      socket.addEventListener('message', handler)

      socket.send(JSON.stringify({
        ...payload,
        id: crypto.randomUUID(),
        clientId: data.clientId,
        type,
        timestamp: new Date().toISOString(),
      }))
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
  }
}
