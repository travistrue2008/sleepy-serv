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

    const res = await fetch(url.toString())
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
