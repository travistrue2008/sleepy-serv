import { MessageType, createMessage } from './messages'
import { joinRoute } from './utils'

export * from './messages'
export * from './utils'

export type TimeoutHandle = ReturnType<typeof setTimeout>
export type IntervalHandle = ReturnType<typeof setInterval>

export const Queue = {
  None: 'none',
  Fifo: 'fifo',
  Lifo: 'lifo',
} as const

export type Queue = typeof Queue[keyof typeof Queue]

export type ReconnectOptions = {
  minDelay?: number
  maxDelay?: number
  factor?: number
  random?: () => number
}

export type ConnectOptions = {
  queue?: Queue
  secure?: boolean
  timeout?: number
  serverTimeout?: number
  mountPath?: string
  reconnect?: ReconnectOptions | false
}

export type RequestOptions = {
  headers?: Headers
  query?: Record<string, unknown>
  body?: unknown
}

export type ResponseFrame = {
  id: string
  clientId: string
  type: typeof MessageType.Response
  timestamp: string
  status: number
  headers: Record<string, string>
  body: unknown
}

export type NotificationFrame = {
  id: string
  clientId: string
  type: typeof MessageType.Notification
  timestamp: string
  event: string
  headers: Record<string, string>
  body: unknown
}

export type EventHandler = (payload: NotificationFrame) => void

export type TicketData = {
  clientId: string
  ticket: string
  data: unknown
}

type ReconnectConfig = {
  minDelay: number
  maxDelay: number
  factor: number
}

type DispatchedMessage = {
  id: string
  ready: boolean
  timer: ReturnType<typeof setTimeout>
  response: ResponseFrame | null
  resolve: (value: ResponseFrame) => void
  reject: (reason: Error) => void
}

type NormalizedRequestOpts = {
  headers: Headers
  query: Record<string, unknown>
  body: unknown
}

const RECONNECT_JITTER = 0.5
const JSON_CONTENT_TYPE = 'application/json;charset=utf-8'

export default class SleepySocketClient {
  #id: string | null = null
  #queueType: Queue = Queue.None
  #ready = false
  #closing = false
  #secure = false
  #timeout = 30_000
  #serverTimeout = 120_000
  #heartbeatInterval = 30_000
  #mountPath = ''
  #host: string | null = null
  #port: number | null = null
  #token: string | null = null
  #socket: WebSocket | null = null
  #random: () => number = Math.random
  #livenessTimer: ReturnType<typeof setTimeout> | null = null
  #heartbeatTimer: ReturnType<typeof setInterval> | null = null
  #reconnectTimer: ReturnType<typeof setTimeout> | null = null
  #reconnectConfig: ReconnectConfig | null = null
  #connectionData: unknown = null
  #listeners = new Map<string, Set<EventHandler>>()
  #dispatchedMessages: DispatchedMessage[] = []

  get id (): string | null {
    return this.#id
  }

  get isConnected (): boolean {
    return this.#ready
  }

  get isSecure (): boolean {
    return this.#secure
  }

  get queueType (): Queue {
    return this.#queueType
  }

  get timeout (): number {
    return this.#timeout
  }

  get heartbeatInterval (): number {
    return this.#heartbeatInterval
  }

  get serverTimeout (): number {
    return this.#serverTimeout
  }

  get token (): string | null {
    return this.#token
  }

  get mountPath (): string {
    return this.#mountPath
  }

  get socket (): WebSocket | null {
    return this.#socket
  }

  get connectionData (): unknown {
    return this.#connectionData
  }

  static async connect (
    host: string,
    port: number,
    opts: ConnectOptions = {},
  ): Promise<SleepySocketClient> {
    if (opts.queue && !Object.values(Queue).includes(opts.queue)) {
      throw new RangeError(`Invalid queue type: ${opts.queue}`)
    }

    const client = new this()

    const reconnect: ReconnectOptions =
      opts.reconnect && typeof opts.reconnect === 'object'
        ? opts.reconnect
        : {}

    client.#host = host
    client.#port = port
    client.#queueType = opts.queue ?? Queue.None
    client.#secure = opts.secure ?? false
    client.#timeout = opts.timeout ?? 30_000
    client.#serverTimeout = opts.serverTimeout ?? 120_000
    client.#mountPath = opts.mountPath ?? ''

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

  #baseUrl (): string {
    const protocol = this.#secure ? 'https' : 'http'

    return `${protocol}://${this.#host}:${this.#port}${this.#mountPath}`
  }

  async #createTicket (): Promise<TicketData> {
    const response = await fetch(`${this.#baseUrl()}/ws`, {
      method: 'POST',
    })

    return response.json()
  }

  async #reclaimTicket (): Promise<TicketData | null> {
    const url = `${this.#baseUrl()}/ws/${this.#id}`

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

  async #requestTicket (): Promise<TicketData> {
    if (this.#id && this.#token) {
      const reclaimed = await this.#reclaimTicket()

      if (reclaimed) {
        return reclaimed
      }
    }

    return this.#createTicket()
  }

  #socketUrl (ticket: string): string {
    const protocol = this.#secure ? 'wss' : 'ws'
    const authority = `${this.#host}:${this.#port}${this.#mountPath}`

    return `${protocol}://${authority}/ws?ticket=${ticket}`
  }

  #openSocket (
    res: TicketData,
    succeed: () => void,
    fail: (message: string) => void,
  ): void {
    const socket = new WebSocket(this.#socketUrl(res.ticket))

    this.#socket = socket
    this.#connectionData = res.data

    const onError = (): void => fail('Connection failed.')

    const onWelcome = (event: MessageEvent): void => {
      const message = JSON.parse(event.data)

      socket.removeEventListener('message', onWelcome)

      if (message.type !== MessageType.Welcome) {
        fail('Expected a welcome message.')

        return
      }

      this.#id = message.clientId
      this.#token = message.body.token
      this.#heartbeatInterval = message.body.heartbeatInterval

      socket.addEventListener('message', ev => this.#handleMessage(ev))
      socket.addEventListener('close', ev => this.#handleClose(ev))

      this.#startHeartbeat()
      this.#armLiveness()

      this.#ready = true

      succeed()
    }

    socket.addEventListener('open', () => {
      socket.removeEventListener('error', onError)
      socket.addEventListener('message', onWelcome)
    }, { once: true })

    socket.addEventListener('error', onError)
  }

  #establish (): Promise<void> {
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

      const fail = (message: string): void => {
        if (settled) {
          return
        }

        settled = true

        clearTimeout(timer)
        reject(new Error(message))
      }

      const succeed = (): void => {
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

  #armLiveness (): void {
    if (this.#livenessTimer) {
      clearTimeout(this.#livenessTimer)
    }

    this.#livenessTimer = setTimeout(() => {
      this.#socket?.close()
    }, this.serverTimeout)
  }

  #scheduleReconnect (attempt: number, config: ReconnectConfig): void {
    const { minDelay, maxDelay, factor } = config
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

        this.#scheduleReconnect(attempt + 1, config)
      }
    }, delay)
  }

  #startHeartbeat (): void {
    this.#heartbeatTimer = setInterval(() => {
      const message = createMessage(this.#id!, MessageType.Heartbeat)

      this.#socket!.send(JSON.stringify(message))
    }, this.#heartbeatInterval)
  }

  #stopHeartbeat (): void {
    if (this.#heartbeatTimer) {
      clearInterval(this.#heartbeatTimer)
    }

    this.#heartbeatTimer = null
  }

  #normalizeRequestOpts (opts: RequestOptions): NormalizedRequestOpts {
    if (opts.headers !== undefined && !(opts.headers instanceof Headers)) {
      throw new TypeError('opts.headers must be a Headers instance')
    }

    const headers = opts.headers ?? new Headers()
    const query = opts.query ?? {}
    const body = opts.body ?? null

    const isJsonBody = body !== null && typeof body === 'object'

    if (isJsonBody && !headers.has('content-type')) {
      headers.set('content-type', JSON_CONTENT_TYPE)
    }

    return {
      headers,
      query,
      body,
    }
  }

  #sendRequest (
    method: string,
    route: string,
    opts: RequestOptions = {},
  ): Promise<ResponseFrame> {
    if (!this.#ready) {
      throw new Error('Socket is closed')
    }

    const { headers, query, body } = this.#normalizeRequestOpts(opts)
    const fullRoute = joinRoute(this.#mountPath, route)

    const message = createMessage(this.#id!, MessageType.Request, {
      method,
      query,
      body,
      route: fullRoute,
      headers: Object.fromEntries(headers),
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

      this.#socket!.send(JSON.stringify(message))
    })
  }

  #handleClose (event: CloseEvent): void {
    this.#ready = false

    this.#stopHeartbeat()

    if (this.#livenessTimer) {
      clearTimeout(this.#livenessTimer)
    }

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

    this.#scheduleReconnect(0, this.#reconnectConfig)
  }

  #handleRequest (data: ResponseFrame): void {
    const entry = this.#dispatchedMessages.find(item => item.id === data.id)

    if (!entry) {
      return
    }

    clearTimeout(entry.timer)

    entry.response = data
    entry.ready = true

    this.#drain()
  }

  #handleNotification (data: NotificationFrame): void {
    this.#emit('notification', data)
  }

  #handleMessage (event: MessageEvent): void {
    this.#armLiveness()

    const data = JSON.parse(event.data)

    switch (data.type) {
      case MessageType.Heartbeat:
        return

      case MessageType.Response:
        return this.#handleRequest(data)

      case MessageType.Notification:
        return this.#handleNotification(data)

      default:
        throw new RangeError(`Unknown message type: "${data.type}"`)
    }
  }

  #processNone (): void {
    this.#dispatchedMessages = this.#dispatchedMessages.filter(entry => {
      if (entry.ready) {
        entry.resolve(entry.response!)
      }

      return !entry.ready
    })
  }

  #processFifo (): void {
    while (this.#dispatchedMessages[0]?.ready) {
      const [entry] = this.#dispatchedMessages.splice(0, 1)

      entry.resolve(entry.response!)
    }
  }

  #processLifo (): void {
    while (this.#dispatchedMessages.at(-1)?.ready) {
      const entry = this.#dispatchedMessages.pop()

      entry!.resolve(entry!.response!)
    }
  }

  #drain (): void {
    switch (this.#queueType) {
      case Queue.None:
        return this.#processNone()

      case Queue.Fifo:
        return this.#processFifo()

      case Queue.Lifo:
        return this.#processLifo()
    }
  }

  #emit (event: string, payload: NotificationFrame): void {
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

  on (event: string, handler: EventHandler): void {
    if (!this.#listeners.has(event)) {
      this.#listeners.set(event, new Set())
    }

    this.#listeners.get(event)!.add(handler)
  }

  off (event: string, handler: EventHandler): void {
    this.#listeners.get(event)?.delete(handler)
  }

  async close (): Promise<void> {
    if (this.#closing) {
      throw new Error('Socket is closed')
    }

    this.#closing = true
    this.#ready = false

    this.#stopHeartbeat()

    if (this.#livenessTimer) {
      clearTimeout(this.#livenessTimer)
    }

    if (this.#reconnectTimer) {
      clearTimeout(this.#reconnectTimer)
    }

    this.#reconnectTimer = null

    if (this.#socket) {
      await this.#socket.close()

      this.#socket = null
    }
  }

  head (route: string, opts: RequestOptions = {}): Promise<ResponseFrame> {
    return this.#sendRequest('HEAD', route, opts)
  }

  get (route: string, opts: RequestOptions = {}): Promise<ResponseFrame> {
    return this.#sendRequest('GET', route, opts)
  }

  post (route: string, opts: RequestOptions = {}): Promise<ResponseFrame> {
    return this.#sendRequest('POST', route, opts)
  }

  put (route: string, opts: RequestOptions = {}): Promise<ResponseFrame> {
    return this.#sendRequest('PUT', route, opts)
  }

  patch (route: string, opts: RequestOptions = {}): Promise<ResponseFrame> {
    return this.#sendRequest('PATCH', route, opts)
  }

  delete (route: string, opts: RequestOptions = {}): Promise<ResponseFrame> {
    return this.#sendRequest('DELETE', route, opts)
  }
}
