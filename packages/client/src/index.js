import { TYPES, createMessage } from './messages'

export * from './messages'
export * from './utils'

export const QUEUE = {
  NONE: 'none',
  FIFO: 'fifo',
  LIFO: 'lifo',
}

const RECONNECT_JITTER = 0.5

export default class SleepySocketClient {
  #clientId = null
  #queueType = QUEUE.NONE
  #ready = false
  #closing = false
  #secure = false
  #timeout = 30_000
  #serverTimeout = 120_000
  #heartbeatInterval = 30_000
  #host = null
  #port = null
  #token = null
  #socket = null
  #random = Math.random
  #livenessTimer = null
  #heartbeatTimer = null
  #reconnectTimer = null
  #reconnectConfig = null
  #connectionData = null
  #listeners = new Map()
  #dispatchedMessages = []

  get isConnected () {
    return this.#ready
  }

  get queueType () {
    return this.#queueType
  }

  get secure () {
    return this.#secure
  }

  get timeout () {
    return this.#timeout
  }

  get heartbeatInterval () {
    return this.#heartbeatInterval
  }

  get serverTimeout () {
    return this.#serverTimeout
  }

  get clientId () {
    return this.#clientId
  }

  get token () {
    return this.#token
  }

  get socket () {
    return this.#socket
  }

  get connectionData () {
    return this.#connectionData
  }

  static async connect (host, port, opts = {}) {
    if (opts.queue && !Object.values(QUEUE).includes(opts.queue)) {
      throw new RangeError(`Invalid queue type: ${opts.queue}`)
    }

    const client = new this()
    const hasReconnect = opts.reconnect && typeof opts.reconnect === 'object'
    const reconnect = hasReconnect ? opts.reconnect : {}

    client.#host = host
    client.#port = port
    client.#queueType = opts.queue ?? QUEUE.NONE
    client.#secure = opts.secure ?? false
    client.#timeout = opts.timeout ?? 30_000
    client.#serverTimeout = opts.serverTimeout ?? 120_000

    if (opts.reconnect !== false) {
      client.#reconnectConfig = {
        minDelay: reconnect.minDelay ?? 500,
        maxDelay: reconnect.maxDelay ?? 30_000,
        factor: reconnect.factor ?? 2,
      }
    }

    client.#random = reconnect.random ?? Math.random

    await client.#establish()

    return client
  }

  #baseUrl () {
    const protocol = this.#secure ? 'https' : 'http'

    return `${protocol}://${this.#host}:${this.#port}`
  }

  async #createTicket () {
    const response = await fetch(`${this.#baseUrl()}/ws`, {
      method: 'POST',
    })

    return response.json()
  }

  async #reclaimTicket () {
    const url = `${this.#baseUrl()}/ws/${this.#clientId}`

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${this.#token}`,
      },
    })

    if (!response.ok) {
      return null
    }

    return response.json()
  }

  async #requestTicket () {
    if (this.#clientId && this.#token) {
      const reclaimed = await this.#reclaimTicket()

      if (reclaimed) {
        return reclaimed
      }
    }

    return this.#createTicket()
  }

  #socketUrl (ticket) {
    const protocol = this.#secure ? 'wss' : 'ws'
    const authority = `${this.#host}:${this.#port}`

    return `${protocol}://${authority}/ws?ticket=${ticket}`
  }

  #openSocket (res, succeed, fail) {
    this.#socket = new WebSocket(this.#socketUrl(res.ticket))
    this.#connectionData = res.data

    const onError = () => fail('Connection failed.')

    const onWelcome = event => {
      const message = JSON.parse(event.data)

      this.#socket.removeEventListener('message', onWelcome)

      if (message.type !== TYPES.WELCOME) {
        fail('Expected a welcome message.')

        return
      }

      this.#clientId = message.clientId
      this.#token = message.body.token
      this.#heartbeatInterval = message.body.heartbeatInterval

      this.#socket.addEventListener('message', ev => this.#handleMessage(ev))
      this.#socket.addEventListener('close', ev => this.#handleClose(ev))

      this.#startHeartbeat()
      this.#armLiveness()

      this.#ready = true

      succeed()
    }

    this.#socket.addEventListener('open', () => {
      this.#socket.removeEventListener('error', onError)
      this.#socket.addEventListener('message', onWelcome)
    }, { once: true })

    this.#socket.addEventListener('error', onError)
  }

  #establish () {
    return new Promise((resolve, reject) => {
      let settled = false

      const timer = setTimeout(() => {
        if (settled) {
          return
        }

        settled = true

        this.#socket?.close()
        reject(new Error('Connection timed out.'))
      }, this.#timeout)

      const fail = message => {
        if (settled) {
          return
        }

        settled = true

        clearTimeout(timer)
        reject(new Error(message))
      }

      const succeed = () => {
        if (settled) {
          return
        }

        settled = true

        clearTimeout(timer)
        resolve()
      }

      this.#requestTicket()
        .then(ticketData => this.#openSocket(ticketData, succeed, fail))
        .catch(() => fail('Connection failed.'))
    })
  }

  #armLiveness () {
    clearTimeout(this.#livenessTimer)

    this.#livenessTimer = setTimeout(() => {
      this.#socket?.close()
    }, this.serverTimeout)
  }

  #scheduleReconnect (attempt) {
    const { minDelay, maxDelay, factor } = this.#reconnectConfig
    const base = Math.min(minDelay * factor ** attempt, maxDelay)
    const delay = base * (1 + this.#random() * RECONNECT_JITTER)

    this.#reconnectTimer = setTimeout(async () => {
      this.#reconnectTimer = null

      if (this.#closing) {
        return
      }

      try {
        await this.#establish()
      } catch {
        if (this.#closing) {
          return
        }

        this.#scheduleReconnect(attempt + 1)
      }
    }, delay)
  }

  #startHeartbeat () {
    this.#heartbeatTimer = setInterval(() => {
      const message = createMessage(this.#clientId, TYPES.HEARTBEAT)

      this.#socket.send(JSON.stringify(message))
    }, this.#heartbeatInterval)
  }

  #stopHeartbeat () {
    clearInterval(this.#heartbeatTimer)

    this.#heartbeatTimer = null
  }

  #handleClose (event) {
    this.#ready = false

    this.#stopHeartbeat()
    clearTimeout(this.#livenessTimer)

    for (const entry of this.#dispatchedMessages) {
      clearTimeout(entry.timer)
      entry.reject(new Error('Socket closed.'))
    }

    this.#dispatchedMessages = []
    this.#socket = null

    if (this.#closing) {
      return
    }

    if (!this.#reconnectConfig) {
      if (!event.wasClean) {
        throw new Error(`Socket closed unexpectedly (code: ${event.code}).`)
      }

      return
    }

    this.#scheduleReconnect(0)
  }

  #handleRequest (data) {
    const entry = this.#dispatchedMessages.find(item => item.id === data.id)

    if (!entry) {
      return
    }

    clearTimeout(entry.timer)

    entry.response = data
    entry.ready = true

    this.#drain()
  }

  #handleNotification (data) {
    this.#emit('notification', data)
  }

  #handleMessage (event) {
    this.#armLiveness()

    const data = JSON.parse(event.data)

    switch (data.type) {
      case TYPES.HEARTBEAT:
        return

      case TYPES.RESPONSE:
        return this.#handleRequest(data)

      case TYPES.NOTIFICATION:
        return this.#handleNotification(data)

      default:
        throw new RangeError(`Unknown message type: ${data.type}`)
    }
  }

  #processNone () {
    this.#dispatchedMessages = this.#dispatchedMessages.filter(entry => {
      if (entry.ready) {
        entry.resolve(entry.response)
      }

      return !entry.ready
    })
  }

  #processFifo () {
    while (this.#dispatchedMessages[0]?.ready) {
      const [entry] = this.#dispatchedMessages.splice(0, 1)

      entry.resolve(entry.response)
    }
  }

  #processLifo () {
    while (this.#dispatchedMessages.at(-1)?.ready) {
      const entry = this.#dispatchedMessages.pop()

      entry.resolve(entry.response)
    }
  }

  #drain () {
    switch (this.#queueType) {
      case QUEUE.NONE:
        return this.#processNone()

      case QUEUE.FIFO:
        return this.#processFifo()

      case QUEUE.LIFO:
        return this.#processLifo()
    }
  }

  #emit (event, payload) {
    const handlers = this.#listeners.get(event)

    if (!handlers) {
      return
    }

    for (const handler of handlers) {
      try {
        handler(payload)
      } catch (err) {
        console.error(err)
      }
    }
  }

  on (event, handler) {
    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, new Set())
    }

    this.#listeners.get(event).add(handler)
  }

  off (event, handler) {
    this.#listeners.get(event)?.delete(handler)
  }

  async close () {
    if (this.#closing) {
      throw new Error('Socket is closed')
    }

    this.#closing = true
    this.#ready = false

    this.#stopHeartbeat()
    clearTimeout(this.#livenessTimer)
    clearTimeout(this.#reconnectTimer)

    this.#reconnectTimer = null

    if (this.#socket) {
      await this.#socket.close()

      this.#socket = null
    }
  }

  async send (data) {
    if (!this.#ready) {
      throw new Error('Socket is closed')
    }

    const message = createMessage(this.#clientId, TYPES.REQUEST, {
      ...data,
      query: data.query ?? {},
    })

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const index = this.#dispatchedMessages.findIndex(item =>
          item.id === message.id,
        )

        if (index !== -1) {
          this.#dispatchedMessages.splice(index, 1)
        }

        reject(new Error('Request timed out.'))
      }, this.#timeout)

      this.#dispatchedMessages.push({
        id: message.id,
        resolve,
        reject,
        timer,
        ready: false,
        response: null,
      })

      this.#socket.send(JSON.stringify(message))
    })
  }
}
