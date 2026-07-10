import * as uuid from 'uuid'
import { TYPES, createMessage } from './messages'

const CLIENT_ID = uuid.v4()

export * from './messages'

export const QUEUE = {
  NONE: 'none',
  FIFO: 'fifo',
  LIFO: 'lifo',
}

export default class SleepySocketClient {
  #clientId = null
  #queueType = QUEUE.NONE
  #secure = false
  #timeout = 30
  #heartbeatInterval = 30
  #heartbeatTimer = null
  #socket = null
  #dispatchedMessages = []

  get isConnected () {
    return !!this.#socket
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

  get clientId () {
    return this.#clientId
  }

  static async connect (host, port, opts = {}) {
    if (opts.queue && !Object.values(QUEUE).includes(opts.queue)) {
      throw new RangeError(`Invalid queue type: ${opts.queue}`)
    }

    const client = new this()

    client.#queueType = opts.queue ?? QUEUE.NONE
    client.#secure = opts.secure ?? false
    client.#timeout = opts.timeout ?? 30

    const protocol = client.#secure ? 'wss' : 'ws'
    const url = `${protocol}://${host}:${port}/ws`
    const socket = new WebSocket(url)

    client.#socket = socket

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        socket.close()
        reject(new Error('Connection timed out.'))
      }, client.#timeout * 1000)

      const onError = () => {
        clearTimeout(timer)
        reject(new Error('Connection failed.'))
      }

      const onWelcome = event => {
        const message = JSON.parse(event.data)

        clearTimeout(timer)
        socket.removeEventListener('message', onWelcome)

        if (message.type !== TYPES.WELCOME) {
          reject(new Error('Expected a welcome message.'))

          return
        }

        client.#clientId = message.body.clientId
        client.#heartbeatInterval = message.body.heartbeatInterval

        socket.addEventListener('message', event => (
          client.#handleMessage(event)
        ))

        socket.addEventListener('close', event => client.#handleClose(event))
        client.#startHeartbeat()
        resolve(client)
      }

      socket.addEventListener('open', () => {
        socket.removeEventListener('error', onError)
        socket.addEventListener('message', onWelcome)
      }, { once: true })

      socket.addEventListener('error', onError)
    })
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
    this.#stopHeartbeat()

    for (const entry of this.#dispatchedMessages) {
      clearTimeout(entry.timer)
      entry.reject(new Error('socket closed'))
    }

    this.#dispatchedMessages = []

    if (!event.wasClean) {
      throw new Error(`Socket closed unexpectedly (code: ${event.code}).`)
    }
  }

  #handleMessage (event) {
    const reply = JSON.parse(event.data)
    const entry = this.#dispatchedMessages.find(item => item.id === reply.id)

    if (!entry) {
      return
    }

    clearTimeout(entry.timer)

    entry.response = reply
    entry.ready = true

    this.#drain()
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

  async close () {
    this.#stopHeartbeat()

    await this.#socket.close()

    this.#socket = null
  }

  async send (data) {
    if (!this.#socket) {
      throw new Error('socket is closed')
    }

    const message = createMessage(CLIENT_ID, TYPES.REQUEST, {
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
      }, this.#timeout * 1000)

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
