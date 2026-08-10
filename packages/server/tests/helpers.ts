import crypto from 'node:crypto'
import { MessageType } from '../src/messages'

import type { App, HttpMethod } from '../src'

export const Fmt = {
  Text: 'text',
  Json: 'json',
} as const

export type Fmt = typeof Fmt[keyof typeof Fmt]

export type Query = Record<string, string>

export type RequestOptions = {
  mountPath?: string
  query?: Query
  headers?: Headers
  body?: Bun.BodyInit
}

export type HttpResult = {
  status: number
  body: unknown
}

export type BaseMessage = {
  id: string
  clientId?: string
  type: MessageType
  timestamp: string
}

export type ResponseMessage = BaseMessage & {
  status: number
  headers: Record<string, string>
  body: unknown
}

export type HeartbeatMessage = BaseMessage
export type AnyMessage = BaseMessage | ResponseMessage

export type MessagePayload = {
  headers?: unknown
  query?: unknown
  body?: unknown
}

export type RequestorMethod = (
  route: string,
  fmt: Fmt | null,
  opts?: RequestOptions,
) => Promise<HttpResult>

export type Requestor = {
  get: RequestorMethod
  put: RequestorMethod
  post: RequestorMethod
}

export type SocketTestClient = {
  readonly clientId: string
  readonly token: string
  readonly heartbeatInterval: number
  readonly socket: WebSocket
  close: () => Promise<void>
  heartbeat: () => Promise<BaseMessage>
  get: (route: string, opts?: MessagePayload) => Promise<ResponseMessage>
  put: (route: string, opts?: MessagePayload) => Promise<ResponseMessage>
  post: (route: string, opts?: MessagePayload) => Promise<ResponseMessage>
  sendRaw: (payload: Record<string, unknown>) => Promise<AnyMessage>
}

type WelcomeData = {
  clientId: string
  token: string
  heartbeatInterval: number
}

async function deserializeBody (
  fmt: Fmt | null,
  res: Response,
): Promise<unknown> {
  if (!fmt) {
    return undefined
  }

  const body = await res[fmt]()

  return body
}

async function makeRequestMethod (
  app: App,
  method: HttpMethod,
  route: string,
  fmt: Fmt | null,
  opts: RequestOptions = {},
): Promise<HttpResult> {
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

export function createRequestor (app: App): Requestor {
  return {
    get (route: string, fmt: Fmt | null = null, opts: RequestOptions = {}) {
      return makeRequestMethod(app, 'GET', route, fmt, opts)
    },
    put (route: string, fmt: Fmt | null = null, opts: RequestOptions = {}) {
      return makeRequestMethod(app, 'PUT', route, fmt, opts)
    },
    post (route: string, fmt: Fmt | null = null, opts: RequestOptions = {}) {
      return makeRequestMethod(app, 'POST', route, fmt, opts)
    },
  }
}

export async function createSocketClient (
  app: App,
  opts: RequestOptions = {},
): Promise<SocketTestClient> {
  const mountPath = opts.mountPath ?? ''
  const hostRoot = `${app.server.url.host}${mountPath}/ws`
  const req = createRequestor(app)
  const res = await req.post('/ws', Fmt.Json, { mountPath })
  const { ticket } = res.body as { ticket: string }
  const url = `ws://${hostRoot}?ticket=${ticket}`
  const socket = new WebSocket(url)

  const data = await new Promise<WelcomeData>((resolve, reject) => {
    socket.addEventListener('error', event => {
      console.error(event)
      reject(event)
    })

    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data)

      if (message.type !== MessageType.Welcome) {
        const expected = MessageType.Welcome

        return reject(
          new TypeError(
            `Expected ${expected} message, but got: "${message.type}"`,
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

  async function sendRaw (
    payload: Record<string, unknown>,
  ): Promise<AnyMessage> {
    return new Promise(resolve => {
      const handler = (event: MessageEvent): void => {
        resolve(JSON.parse(event.data))

        socket.removeEventListener('message', handler)
      }

      socket.addEventListener('message', handler)
      socket.send(JSON.stringify(payload))
    })
  }

  async function sendMessage (
    type: MessageType,
    payload: Record<string, unknown>,
  ): Promise<ResponseMessage> {
    return new Promise(resolve => {
      const handler = (event: MessageEvent): void => {
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
      }).then((value: unknown) => resolve(value as ResponseMessage))
    })
  }

  async function sendRequest (
    method: HttpMethod,
    route: string,
    payload: MessagePayload,
  ): Promise<ResponseMessage> {
    const message = await sendMessage(MessageType.Request, {
      method,
      route,
      headers: payload.headers ?? {},
      query: payload.query ?? {},
      body: payload.body ?? {},
    })

    return message as ResponseMessage
  }

  return {
    get clientId (): string {
      return data.clientId
    },
    get token (): string {
      return data.token
    },
    get heartbeatInterval (): number {
      return data.heartbeatInterval
    },
    get socket (): WebSocket {
      return socket
    },
    async close () {
      socket.close()

      await Promise.resolve() /* revisit this */
    },
    heartbeat (): Promise<BaseMessage> {
      return sendMessage(MessageType.Heartbeat, {})
    },
    get (route: string, opts: MessagePayload = {}): Promise<ResponseMessage> {
      return sendRequest('GET', route, opts)
    },
    put (route: string, opts: MessagePayload = {}): Promise<ResponseMessage> {
      return sendRequest('PUT', route, opts)
    },
    post (route: string, opts: MessagePayload = {}): Promise<ResponseMessage> {
      return sendRequest('POST', route, opts)
    },
    sendRaw (payload: MessagePayload): Promise<AnyMessage> {
      return sendRaw(payload)
    },
  }
}
