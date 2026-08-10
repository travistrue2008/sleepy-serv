import crypto from 'node:crypto'
import { MessageType } from '../src/messages'

import type { App, HttpMethod } from '../src'

export const FMT = {
  TEXT: 'text',
  JSON: 'json',
} as const

export type FMT = typeof FMT[keyof typeof FMT]

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

export type ResponseFrame = {
  id: string
  clientId: string
  type: MessageType
  timestamp: string
  status: number
  headers: Record<string, string>
  body: unknown
}

export type MessagePayload = {
  headers?: unknown
  query?: unknown
  body?: unknown
}

export type RequestorMethod = (
  route: string,
  fmt: FMT | null,
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
  heartbeat: () => Promise<unknown>
  get: (route: string, opts?: MessagePayload) => Promise<ResponseFrame>
  put: (route: string, opts?: MessagePayload) => Promise<ResponseFrame>
  post: (route: string, opts?: MessagePayload) => Promise<ResponseFrame>
  sendRaw: (payload: Record<string, unknown>) => Promise<unknown>
}

type WelcomeData = {
  clientId: string
  token: string
  heartbeatInterval: number
}

async function deserializeBody (
  fmt: FMT | null,
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
  fmt: FMT | null,
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
    get (route, fmt = null, opts = {}) {
      return makeRequestMethod(app, 'GET', route, fmt, opts)
    },
    put (route, fmt = null, opts = {}) {
      return makeRequestMethod(app, 'PUT', route, fmt, opts)
    },
    post (route, fmt = null, opts = {}) {
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
  const res = await req.post('/ws', FMT.JSON, { mountPath })
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

  async function sendRaw (payload: Record<string, unknown>): Promise<unknown> {
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
  ): Promise<unknown> {
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
      }).then(resolve)
    })
  }

  async function sendRequest (
    method: HttpMethod,
    route: string,
    payload: MessagePayload,
  ): Promise<ResponseFrame> {
    const message = await sendMessage(MessageType.Request, {
      method,
      route,
      headers: payload.headers ?? {},
      query: payload.query ?? {},
      body: payload.body ?? {},
    })

    return message as ResponseFrame
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
    heartbeat (): Promise<unknown> {
      return sendMessage(MessageType.Heartbeat, {})
    },
    get (route: string, opts: MessagePayload = {}): Promise<ResponseFrame> {
      return sendRequest('GET', route, opts)
    },
    put (route: string, opts: MessagePayload = {}): Promise<ResponseFrame> {
      return sendRequest('PUT', route, opts)
    },
    post (route: string, opts: MessagePayload = {}): Promise<ResponseFrame> {
      return sendRequest('POST', route, opts)
    },
    sendRaw (payload: MessagePayload): Promise<unknown> {
      return sendRaw(payload)
    },
  }
}
