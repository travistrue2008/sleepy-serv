import * as uuid from 'uuid'
import { TYPES } from '../src/messages'
import { createApp } from '../src'

export const FMT = {
  NONE: 'none',
  TEXT: 'text',
  JSON: 'json',
}

export class Context {
  static #currentOpenPort = 3000

  #port = null
  #app = null
  #socket = null

  static async create(dirname, opts = {}) {
    const ctx = new this()

    ctx.#port = this.#getOpenPort()
    ctx.#app = await createApp(ctx.#port, dirname, opts)

    if (!opts.hostname) {
      ctx.#socket = new WebSocket(`ws://localhost:${ctx.#port}/socket`)

      await new Promise((resolve, reject) => {
        ctx.#socket.addEventListener('error', event => {
          console.error(event)
          reject(event)
        })

        ctx.#socket.addEventListener('open', resolve)
      })
    }

    return ctx
  }

  static #getOpenPort() {
    this.#currentOpenPort += 1

    return this.#currentOpenPort
  }

  get port() {
    return this.#port
  }

  get app() {
    return this.#app
  }

  get socket() {
    return this.#socket
  }

  async #parseBody(response, fmt) {
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

  async shutdown() {
    if (this.#socket) {
      await this.#socket.close()
    }

    await this.#app.server.stop(true)
  }

  async makeRequest(route, fmt, opts = {}) {
    const baseUrl = `http://localhost:${this.#port}`
    const url = new URL(route, baseUrl);
    const search = new URLSearchParams(opts.query ?? {})

    url.search = search

    const res = await fetch(url.toString())
    const body = await this.#parseBody(res, fmt)

    return {
      status: res.status,
      body,
    }
  }

  async sendMessage(method, route, payload = {}) {
    return new Promise(resolve => {
      const message = JSON.stringify({
        id: uuid.v4(),
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

  async sendMessageRaw(payload) {
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
