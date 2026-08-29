import SleepySocketClient, {
  Queue,
  MessageType,
  HandshakeError,
} from './'
import { StatusCode, CloseCode, id } from './utils'

import {
  jest,
  mock,
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
} from 'bun:test'

import type {
  ConnectOptions,
  NotificationMessage,
  ResponseMessage,
} from './'

type MockEventType = 'open' | 'close' | 'error' | 'message'

type MockEvent = {
  wasClean?: boolean
  code?: number
  data?: string
}

type MockListener = (event: MockEvent) => void

type MockResponse = {
  ok: boolean
  status?: number
  json: () => Promise<unknown>
}

/*
  The client always calls fetch with both arguments, so `options` is
  declared required. That keeps `options.method` readable at the call
  sites instead of threading `?.` through every stub.
 */

type FetchMock = ReturnType<
  typeof mock<
    (
      url: unknown,
      options: { method?: string },
    ) => Promise<MockResponse>
  >
>

const CLIENT_ID = '11111111-1111-4111-8111-111111111111'
const OTHER_CLIENT_ID = '22222222-2222-4222-8222-222222222222'
const TIMESTAMP = '2000-01-01T00:00:00.000Z'
const HEARTBEAT_INTERVAL = 30_000
const SERVER_TIMEOUT = 120_000
const TICKET = 'test-ticket'
const TOKEN = 'test-token'

class MockWebSocket {
  static last: MockWebSocket | null = null

  readyState = 0
  url: string
  sent: string[] = []

  #listeners: Record<MockEventType, MockListener[]> = {
    open: [],
    close: [],
    error: [],
    message: [],
  }

  constructor (url: string) {
    this.url = url

    MockWebSocket.last = this
  }

  #emit (type: MockEventType, event: MockEvent): void {
    for (const listener of [...this.#listeners[type]]) {
      listener(event)
    }
  }

  addEventListener (
    type: MockEventType,
    callback: MockListener,
    options: { once?: boolean } = {},
  ): void {
    const listener: MockListener = options.once
      ? event => {
        this.removeEventListener(type, listener)
        callback(event)
      }
      : callback

    this.#listeners[type].push(listener)
  }

  removeEventListener (type: MockEventType, callback: MockListener): void {
    this.#listeners[type] = this.#listeners[type].filter(item => (
      item !== callback
    ))
  }

  send (data: string): void {
    this.sent.push(data)
  }

  close (code: number): void {
    this.readyState = 3

    this.#emit('close', {
      wasClean: code === CloseCode.Normal,
      code,
    })
  }

  /* test controls */

  open (): void {
    this.readyState = 1
    this.#emit('open', {})
  }

  error (event: MockEvent = {}): void {
    this.#emit('error', event)
  }

  receive (payload: unknown): void {
    this.#emit('message', {
      data: JSON.stringify(payload),
    })
  }

  /* simulate an abnormal closure (e.g. network drop, server crash) */

  drop (code = CloseCode.Abnormal): void {
    this.readyState = 3

    this.#emit('close', {
      wasClean: false,
      code,
    })
  }
}

/*
  Every caller reaches for the socket only after an action that constructs
  one, so a null here means the test's arrangement is wrong. Throwing says
  that plainly instead of failing later on a null property access.
 */

function lastSocket (): MockWebSocket {
  if (!MockWebSocket.last) {
    throw new Error('No MockWebSocket has been constructed')
  }

  return MockWebSocket.last
}

function sendWelcome (clientId: string): unknown {
  return {
    id: id(),
    clientId,
    type: MessageType.Welcome,
    timestamp: TIMESTAMP,
    headers: {},
    body: {
      token: TOKEN,
      heartbeatInterval: HEARTBEAT_INTERVAL,
    },
  }
}

/*
  Flush the microtask queue so the async POST /ws handshake settles and the
  WebSocket is constructed. Fake timers don't touch microtasks, so a handful of
  awaited resolutions is enough to drain the fetch -> json -> open-socket chain.
 */

async function settle () {
  for (let i = 0; i < 6; i++) {
    await Promise.resolve()
  }
}

/* mirror send()'s async wrapper; responses arrive as later events */

const flush = () => Promise.resolve()

function mockTicketFetch (): FetchMock {
  return mock(async () => ({
    ok: true,
    json: async () => ({
      ticket: TICKET,
      clientId: CLIENT_ID,
      data: {
        token: 'Bearer abc',
      },
    }),
  }))
}

async function connectAndOpen (opts?: ConnectOptions): Promise<{
  client: SleepySocketClient
  socket: MockWebSocket
}> {
  const promise = SleepySocketClient.connect('localhost', 3000, opts)

  await settle()

  lastSocket().open()
  lastSocket().receive(sendWelcome(CLIENT_ID))

  return {
    client: await promise,
    socket: lastSocket(),
  }
}

/* fire the backoff timer, then welcome the new socket */

async function reconnect (
  delay = 500,
  clientId = CLIENT_ID,
): Promise<MockWebSocket> {
  jest.advanceTimersByTime(delay)

  await settle()

  lastSocket().open()
  lastSocket().receive(sendWelcome(clientId))

  await settle()

  return lastSocket()
}

/* build a response frame that correlates to a sent request id */

function response (id: string, body: unknown): ResponseMessage {
  return {
    id,
    clientId: CLIENT_ID,
    type: MessageType.Response,
    status: StatusCode.Ok,
    timestamp: TIMESTAMP,
    headers: {},
    body,
  }
}

/* build a server-initiated notification frame */

function notification (event: string, body: unknown): NotificationMessage {
  return {
    id: id(),
    clientId: CLIENT_ID,
    type: MessageType.Notification,
    event,
    timestamp: TIMESTAMP,
    headers: {},
    body,
  }
}

/*
  Both doubles implement only the surface the client actually touches, so
  neither is structurally a `WebSocket` or a `fetch`. The casts are the
  point of a stub: filling in `preconnect`, `binaryType`, `CONNECTING` and
  the rest would be dead code that no test can reach.
 */

function installWebSocketMock (): void {
  globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket
}

function installFetchMock (impl: FetchMock): void {
  globalThis.fetch = impl as unknown as typeof fetch
}

function fetchMock (): FetchMock {
  return globalThis.fetch as unknown as FetchMock
}

let OriginalWebSocket: typeof globalThis.WebSocket
let OriginalFetch: typeof globalThis.fetch

beforeEach(() => {
  OriginalWebSocket = globalThis.WebSocket
  OriginalFetch = globalThis.fetch

  installWebSocketMock()
  installFetchMock(mockTicketFetch())

  MockWebSocket.last = null
})

afterEach(() => {
  globalThis.WebSocket = OriginalWebSocket
  globalThis.fetch = OriginalFetch
})

/*
  Every other test reaches these through the constant, so the system stays
  self-consistent under any value. They are public API though: `Queue` is
  the union `'none' | 'fifo' | 'lifo'`, so a consumer may pass a raw
  string, and changing one would break them silently.
 */

describe('Queue', () => {
  test('when every member is compared against its literal value', () => {
    expect(Queue).toStrictEqual({
      None: 'none',
      Fifo: 'fifo',
      Lifo: 'lifo',
    })
  })
})

describe('SleepySocketClient', () => {
  describe('.connect()', () => {
    test('when "opts.queue" is invalid', async () => {
      const promise = SleepySocketClient.connect('localhost', 3000, {
        /* deliberately invalid: the guard under test is a runtime one */
        // @ts-expect-error
        queue: 'nope',
      })

      await expect(promise).rejects.toThrow(
        new RangeError('Invalid queue type: nope'),
      )
    })

    test('when the ticket request fails', async () => {
      installFetchMock(mock(async () => {
        throw new Error('Down')
      }))

      const promise = SleepySocketClient.connect('localhost', 3000)

      await expect(promise).rejects.toThrow(new Error('Connection failed.'))
    })

    test('when the server rejects the handshake', async () => {
      const BODY_ERROR = {
        message: 'Game is full',
      }

      installFetchMock(mock(async (_url, _opts) => ({
        ok: false,
        status: 409,
        json: async () => BODY_ERROR,
      })))

      const promise = SleepySocketClient.connect('localhost', 3000)

      await expect(promise).rejects.toThrow(
        new HandshakeError(409, BODY_ERROR),
      )

      await expect(promise).rejects.toMatchObject({
        status: 409,
        body: BODY_ERROR,
      })
    })

    test('when the server rejects with unparseable body', async () => {
      installFetchMock(mock(async (_url, _opts) => ({
        ok: false,
        status: 500,
        text: async () => 'A problem occurred',
        json: async () => {
          throw new SyntaxError('Bad')
        },
      })))

      const promise = SleepySocketClient.connect('localhost', 3000)

      await expect(promise).rejects.toThrow(new Error('Connection failed.'))
    })

    test('when connecting to a server fails', async () => {
      const promise = SleepySocketClient.connect('localhost', 3000)

      await settle()

      lastSocket().error()

      await expect(promise).rejects.toThrow(new Error('Connection failed.'))
    })

    test('when connecting to a server times out', async () => {
      const promise = SleepySocketClient.connect('localhost', 3000)

      jest.advanceTimersByTime(30_000)

      await expect(promise).rejects.toThrow(new Error('Connection timed out.'))
    })

    test('when opened but no welcome frame arrives', async () => {
      const promise = SleepySocketClient.connect('localhost', 3000)

      await settle()

      lastSocket().open()

      jest.advanceTimersByTime(30_000)

      await expect(promise).rejects.toThrow(new Error('Connection timed out.'))
    })

    test('when the first frame is not a welcome', async () => {
      const promise = SleepySocketClient.connect('localhost', 3000)

      await settle()

      lastSocket().open()

      lastSocket().receive({
        type: MessageType.Response,
      })

      await expect(promise).rejects.toThrow(
        new Error('Expected a welcome message.'),
      )
    })

    test('when successful', async () => {
      const { client, socket } = await connectAndOpen()

      expect(client.isConnecting).toBe(false)
      expect(client.isConnected).toBe(true)
      expect(client.queueType).toBe(Queue.None)
      expect(client.isSecure).toBe(false)
      expect(client.timeout).toBe(30_000)
      expect(client.heartbeatInterval).toBe(30_000)
      expect(client.serverTimeout).toBe(120_000)
      expect(client.id).toBe(CLIENT_ID)
      expect(client.token).toBe(TOKEN)
      expect(client.socket).toBe(socket as unknown as WebSocket)

      expect(client.connectionData).toStrictEqual({
        token: 'Bearer abc',
      })

      expect(socket.url).toContain('/ws?ticket=')

      expect(globalThis.fetch).toHaveBeenCalledOnce()

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/ws',
        { method: 'POST' },
      )
    })

    test('when the welcome frame arrives', async () => {
      const { client } = await connectAndOpen()

      expect(client.id).toBe(CLIENT_ID)
      expect(client.heartbeatInterval).toBe(HEARTBEAT_INTERVAL)
    })

    test('when "opts.queue" is set', async () => {
      const { client } = await connectAndOpen({
        queue: Queue.Fifo,
      })

      expect(client.queueType).toBe(Queue.Fifo)
    })

    test('when "opts.secure" is set', async () => {
      const { client, socket } = await connectAndOpen({
        secure: true,
      })

      expect(client.isSecure).toBe(true)
      expect(socket.url).toBe(`wss://localhost:3000/ws?ticket=${TICKET}`)
    })

    test('when "opts.timeout" is set', async () => {
      const { client } = await connectAndOpen({
        timeout: 60_000,
      })

      expect(client.timeout).toBe(60_000)
    })

    test('when "opts.mountPath" is set', async () => {
      const { client } = await connectAndOpen({
        mountPath: '/test-mount-path',
      })

      expect(client.mountPath).toBe('/test-mount-path')
    })

    test('when "opts.ctx" is provided', async () => {
      const ctx = {
        gameId: 'g1',
        playerId: 'p1',
      }

      await connectAndOpen({ ctx })

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/ws',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json;charset=utf-8',
          },
          body: JSON.stringify({ data: ctx }),
        },
      )
    })
  })

  describe('close()', () => {
    test('when failed', async () => {
      const { client } = await connectAndOpen()

      await client.close()

      const fn = () => client.close()

      expect(fn).toThrow(new Error('Socket is closed'))
    })

    test('when successful', async () => {
      const { client } = await connectAndOpen()
      const fn = () => client.get('/')

      expect(client.isConnected).toBe(true)

      await client.close()

      expect(client.isConnected).toBe(false)

      await expect(fn).toThrow(new Error('Socket is closed'))
    })

    test('when the socket is null', async () => {
      const { client, socket } = await connectAndOpen({
        reconnect: {
          random: () => 0,
        },
      })

      socket.drop()

      await client.close()

      expect(client.isConnected).toBe(false)
      expect(client.isReconnecting).toBe(false)
    })

    test('when the disconnect handler is registered', async () => {
      const handler = mock()
      const { client } = await connectAndOpen()

      client.on('disconnect', handler)

      await client.close()

      expect(handler).toHaveBeenCalledOnce()

      expect(handler).toHaveBeenCalledWith({
        code: CloseCode.Normal,
      })
    })

    test('when reconnect is disabled and the socket drops', async () => {
      const handler = mock()

      const { client, socket } = await connectAndOpen({
        reconnect: false,
      })

      client.on('disconnect', handler)
      socket.drop()

      expect(client.isReconnecting).toBe(false)
      expect(handler).toHaveBeenCalledOnce()

      expect(handler).toHaveBeenCalledWith({
        code: CloseCode.Abnormal,
      })
    })
  })

  describe('heartbeat', () => {
    test('when the heartbeat interval elapses', async () => {
      const { socket } = await connectAndOpen()

      jest.advanceTimersByTime(HEARTBEAT_INTERVAL)

      const sent = JSON.parse(socket.sent[0])

      expect(sent).toStrictEqual({
        id: sent.id,
        clientId: CLIENT_ID,
        type: MessageType.Heartbeat,
        timestamp: sent.timestamp,
        headers: {},
        body: null,
      })
    })

    test('when the client is closed', async () => {
      const { client, socket } = await connectAndOpen()

      await client.close()

      jest.advanceTimersByTime(HEARTBEAT_INTERVAL * 3)

      expect(socket.sent).toHaveLength(0)
    })
  })

  describe('liveness', () => {
    test('when no serverTimeout is set', async () => {
      const { client } = await connectAndOpen()

      expect(client.serverTimeout).toBe(SERVER_TIMEOUT)
    })

    test('when "opts.serverTimeout" is set', async () => {
      const { client } = await connectAndOpen({
        serverTimeout: 5_000,
        reconnect: {
          random: () => 0,
        },
      })

      expect(client.serverTimeout).toBe(5_000)

      jest.advanceTimersByTime(5_000)

      expect(client.isConnected).toBe(false)
    })

    test('when an inbound frame arrives', async () => {
      const { client, socket } = await connectAndOpen()

      jest.advanceTimersByTime(SERVER_TIMEOUT - 1_000)

      socket.receive(response('unmatched', null))

      jest.advanceTimersByTime(SERVER_TIMEOUT - 1_000)

      expect(client.isConnected).toBe(true)
    })

    test('when the server goes silent', async () => {
      const { client, socket } = await connectAndOpen({
        reconnect: {
          random: () => 0,
        },
      })

      jest.advanceTimersByTime(SERVER_TIMEOUT)

      expect(client.isConnected).toBe(false)

      await reconnect()

      expect(MockWebSocket.last).not.toBe(socket)
    })

    test('when the client is closed', async () => {
      const { client } = await connectAndOpen()

      await client.close()

      jest.advanceTimersByTime(HEARTBEAT_INTERVAL * 6)

      expect(client.isConnected).toBe(false)
    })
  })

  describe('reconnect', () => {
    test('when isConnecting transitions during reconnect', async () => {
      const { client, socket } = await connectAndOpen({
        reconnect: {
          random: () => 0,
        },
      })

      expect(client.isConnecting).toBe(false)

      socket.drop()

      expect(client.isConnecting).toBe(false)

      jest.advanceTimersByTime(500)

      await settle()

      expect(client.isConnecting).toBe(true)

      lastSocket().open()
      lastSocket().receive(sendWelcome(CLIENT_ID))

      await settle()

      expect(client.isConnecting).toBe(false)
      expect(client.isConnected).toBe(true)
    })

    test('when the socket drops unexpectedly', async () => {
      const handler = mock()

      const { client, socket } = await connectAndOpen({
        reconnect: {
          random: () => 0,
        },
      })

      client.on('disconnect', handler)
      socket.drop()

      expect(client.isReconnecting).toBe(true)

      const next = await reconnect()

      expect(next).not.toBe(socket)
      expect(client.isReconnecting).toBe(false)
      expect(handler).toHaveBeenCalledOnce()

      expect(handler).toHaveBeenCalledWith({
        code: CloseCode.Abnormal,
      })
    })

    test('when a clean close was not app-initiated', async () => {
      const handler = mock()

      const { client, socket } = await connectAndOpen({
        reconnect: {
          random: () => 0,
        },
      })

      client.on('disconnect', handler)
      socket.close(CloseCode.Normal)

      expect(client.isConnected).toBe(false)
      expect(handler).toHaveBeenCalledOnce()

      expect(handler).toHaveBeenCalledWith({
        code: CloseCode.Normal,
      })
    })

    test('when the app closes the client', async () => {
      const handler = mock()

      const { client, socket } = await connectAndOpen({
        reconnect: {
          random: () => 0,
        },
      })

      client.on('disconnect', handler)

      await client.close()

      jest.advanceTimersByTime(HEARTBEAT_INTERVAL)

      await settle()

      expect(MockWebSocket.last).toBe(socket)
      expect(client.isReconnecting).toBe(false)
      expect(handler).toHaveBeenCalledOnce()

      expect(handler).toHaveBeenCalledWith({
        code: CloseCode.Normal,
      })
    })

    test('when an app-initiated close reports 1006', async () => {
      const { client, socket } = await connectAndOpen({
        reconnect: {
          random: () => 0,
        },
      })

      await client.close()

      socket.drop()

      jest.advanceTimersByTime(HEARTBEAT_INTERVAL)

      await settle()

      expect(MockWebSocket.last).toBe(socket)
    })

    test('when reconnecting', async () => {
      const handler = mock()

      const { client, socket } = await connectAndOpen({
        reconnect: {
          random: () => 0,
        },
      })

      client.on('disconnect', handler)
      socket.drop()

      const postDropStatus = client.isConnected

      await reconnect()

      expect(postDropStatus).toBe(false)
      expect(client.isConnected).toBe(true)
      expect(client.queueType).toBe(Queue.None)
      expect(client.isSecure).toBe(false)
      expect(client.timeout).toBe(30_000)
      expect(client.heartbeatInterval).toBe(30_000)
      expect(client.serverTimeout).toBe(120_000)
      expect(client.id).toBe(CLIENT_ID)
      expect(client.token).toBe(TOKEN)
      expect(client.socket).not.toBe(socket)

      expect(globalThis.fetch).toHaveBeenCalledTimes(2)

      expect(globalThis.fetch).toHaveBeenNthCalledWith(
        1,
        `http://localhost:3000/ws`,
        { method: 'POST' },
      )

      expect(globalThis.fetch).toHaveBeenNthCalledWith(
        2,
        `http://localhost:3000/ws/${CLIENT_ID}`,
        {
          method: 'PUT',
          headers: {
            authorization: `Bearer ${TOKEN}`,
          },
        },
      )

      expect(handler).toHaveBeenCalledOnce()

      expect(handler).toHaveBeenCalledWith({
        code: CloseCode.Abnormal,
      })
    })

    test('when "opts.ctx" is provided', async () => {
      const ctx = {
        gameId: 'g1',
        playerId: 'p1',
      }

      const { client, socket } = await connectAndOpen({
        ctx,
        reconnect: {
          random: () => 0,
        },
      })

      socket.drop()

      await reconnect()

      expect(client.isConnected).toBe(true)

      expect(globalThis.fetch).toHaveBeenCalledTimes(2)

      expect(globalThis.fetch).toHaveBeenNthCalledWith(
        1,
        'http://localhost:3000/ws',
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json;charset=utf-8',
          },
          body: JSON.stringify({ data: ctx }),
        },
      )

      expect(globalThis.fetch).toHaveBeenNthCalledWith(
        2,
        `http://localhost:3000/ws/${CLIENT_ID}`,
        {
          method: 'PUT',
          headers: {
            authorization: `Bearer ${TOKEN}`,
          },
        },
      )
    })

    test('when the PUT reclaim fails', async () => {
      const { socket } = await connectAndOpen({
        reconnect: {
          random: () => 0,
        },
      })

      installFetchMock(mock(async (_url, options) => ({
        ok: options.method === 'POST',
        status: options.method === 'POST' ? 201 : 404,
        json: async () => ({
          ticket: TICKET,
          clientId: OTHER_CLIENT_ID,
        }),
      })))

      socket.drop()

      jest.advanceTimersByTime(500)

      await settle()
      await settle()

      lastSocket().open()
      lastSocket().receive(sendWelcome(OTHER_CLIENT_ID))

      await settle()

      const methods = fetchMock().mock.calls.map(
        ([, opts]) => opts.method,
      )

      expect(methods).toStrictEqual(['PUT', 'POST'])
    })

    test('when reclaim receives an app-level refusal', async () => {
      const ERROR_BODY = {
        message: 'Game ended',
      }

      const { socket } = await connectAndOpen({
        reconnect: {
          random: () => 0,
        },
      })

      installFetchMock(mock(async (_url, _opts) => ({
        ok: false,
        status: 409,
        json: async () => ERROR_BODY,
      })))

      socket.drop()

      jest.advanceTimersByTime(500)

      await settle()
      await settle()

      expect(fetchMock()).toHaveBeenCalledOnce()
      expect(MockWebSocket.last).toBe(socket)
    })

    test('when the welcome returns the same clientId', async () => {
      const { client, socket } = await connectAndOpen({
        reconnect: {
          random: () => 0,
        },
      })

      socket.drop()

      await reconnect()

      expect(client.id).toBe(CLIENT_ID)
    })

    test('when the welcome returns a new clientId', async () => {
      const { client, socket } = await connectAndOpen({
        reconnect: {
          random: () => 0,
        },
      })

      socket.drop()

      await reconnect(500, OTHER_CLIENT_ID)

      expect(client.id).toBe(OTHER_CLIENT_ID)
    })

    test('when a reconnect welcome never arrives', async () => {
      const { socket } = await connectAndOpen({
        timeout: 10_000,
        reconnect: {
          random: () => 0,
        },
      })

      socket.drop()

      jest.advanceTimersByTime(500)

      await settle()

      lastSocket().open()

      const attempted = MockWebSocket.last

      jest.advanceTimersByTime(10_000)

      await settle()

      jest.advanceTimersByTime(1_000)

      await settle()

      expect(MockWebSocket.last).not.toBe(attempted)
    })

    test('when the client is closed mid-reconnect', async () => {
      const { client, socket } = await connectAndOpen({
        reconnect: {
          random: () => 0,
        },
      })

      socket.drop()

      await client.close()

      jest.advanceTimersByTime(HEARTBEAT_INTERVAL)

      await settle()

      expect(MockWebSocket.last).toBe(socket)
    })
  })

  describe('backoff', () => {
    test('when reconnecting, the first attempt waits minDelay', async () => {
      const { socket } = await connectAndOpen({
        reconnect: {
          random: () => 0,
          minDelay: 500,
        },
      })

      const before = fetchMock().mock.calls.length

      socket.drop()

      jest.advanceTimersByTime(499)

      await settle()

      expect(fetchMock().mock.calls.length).toBe(before)

      jest.advanceTimersByTime(1)

      await settle()

      expect(fetchMock().mock.calls.length).toBe(before + 1)
    })

    test('when an attempt fails', async () => {
      const { socket } = await connectAndOpen({
        reconnect: {
          random: () => 0,
          minDelay: 500,
          factor: 2,
        },
      })

      installFetchMock(mock(async () => {
        throw new Error('Down')
      }))

      socket.drop()

      jest.advanceTimersByTime(500)

      await settle()

      const after = fetchMock().mock.calls.length

      jest.advanceTimersByTime(999)

      await settle()

      expect(fetchMock().mock.calls.length).toBe(after)

      jest.advanceTimersByTime(1)

      await settle()

      expect(fetchMock().mock.calls.length).toBe(after + 1)
    })

    test('when the backoff exceeds maxDelay, it is capped', async () => {
      const { socket } = await connectAndOpen({
        reconnect: {
          random: () => 0,
          minDelay: 500,
          factor: 10,
          maxDelay: 1_000,
        },
      })

      installFetchMock(mock(async () => {
        throw new Error('Down')
      }))

      socket.drop()

      jest.advanceTimersByTime(500)

      await settle()

      jest.advanceTimersByTime(1_000)

      await settle()

      const after = fetchMock().mock.calls.length

      jest.advanceTimersByTime(1_000)

      await settle()

      expect(fetchMock().mock.calls.length).toBe(after + 1)
    })

    test('when jitter is applied, the delay stays within bounds', async () => {
      const { socket } = await connectAndOpen({
        reconnect: {
          random: () => 1,
          minDelay: 500,
        },
      })

      const before = fetchMock().mock.calls.length

      socket.drop()

      jest.advanceTimersByTime(749)

      await settle()

      expect(fetchMock().mock.calls.length).toBe(before)

      jest.advanceTimersByTime(1)

      await settle()

      expect(fetchMock().mock.calls.length).toBe(before + 1)
    })
  })

  describe('messages', () => {
    describe('notification', () => {
      test('when a notification arrives', async () => {
        const { client, socket } = await connectAndOpen()

        const message = notification('state_changed', { score: 1 })
        const received: unknown[] = []

        client.on('notification', message => received.push(message))
        socket.receive(message)

        expect(received).toStrictEqual([message])
      })

      test('when a handler is removed with off()', async () => {
        const { client, socket } = await connectAndOpen()

        const received: unknown[] = []
        const handler = (message: unknown) => received.push(message)

        const notifications = [
          notification('state_changed', { score: 1 }),
          notification('state_changed', { score: 2 }),
        ]

        client.on('notification', handler)
        socket.receive(notifications[0])
        client.off('notification', handler)
        socket.receive(notifications[1])

        expect(received).toStrictEqual([notifications[0]])
      })

      test('when a notification arrives before timeout', async () => {
        const { client, socket } = await connectAndOpen()

        jest.advanceTimersByTime(SERVER_TIMEOUT - 1_000)
        socket.receive(notification('state_changed', { score: 1 }))
        jest.advanceTimersByTime(SERVER_TIMEOUT - 1_000)

        expect(client.isConnected).toBe(true)
      })
    })

    describe('unknown', () => {
      test('when an unknown message type arrives', async () => {
        const { socket } = await connectAndOpen()

        const fn = () => socket.receive({
          id: id(),
          type: 'garbage',
          timestamp: TIMESTAMP,
        })

        expect(fn).toThrow(new RangeError('Unknown message type: "garbage"'))
      })
    })
  })

  describe('head()', () => {
    test('when called', async () => {
      const { client, socket } = await connectAndOpen()

      client.head('/users')

      const sent = JSON.parse(socket.sent[0])

      expect(sent).toStrictEqual({
        id: sent.id,
        clientId: sent.clientId,
        type: MessageType.Request,
        method: 'HEAD',
        route: '/users',
        timestamp: TIMESTAMP,
        query: {},
        headers: {},
        body: null,
      })
    })
  })

  describe('post()', () => {
    test('when called', async () => {
      const { client, socket } = await connectAndOpen()

      client.post('/users')

      const sent = JSON.parse(socket.sent[0])

      expect(sent).toStrictEqual({
        id: sent.id,
        clientId: sent.clientId,
        type: MessageType.Request,
        method: 'POST',
        route: '/users',
        timestamp: TIMESTAMP,
        query: {},
        headers: {},
        body: null,
      })
    })
  })

  describe('put()', () => {
    test('when called', async () => {
      const { client, socket } = await connectAndOpen()

      client.put('/users/123')

      const sent = JSON.parse(socket.sent[0])

      expect(sent).toStrictEqual({
        id: sent.id,
        clientId: sent.clientId,
        type: MessageType.Request,
        method: 'PUT',
        route: '/users/123',
        timestamp: TIMESTAMP,
        query: {},
        headers: {},
        body: null,
      })
    })
  })

  describe('patch()', () => {
    test('when called', async () => {
      const { client, socket } = await connectAndOpen()

      client.patch('/users/123')

      const sent = JSON.parse(socket.sent[0])

      expect(sent).toStrictEqual({
        id: sent.id,
        clientId: sent.clientId,
        type: MessageType.Request,
        method: 'PATCH',
        route: '/users/123',
        timestamp: TIMESTAMP,
        query: {},
        headers: {},
        body: null,
      })
    })
  })

  describe('delete()', () => {
    test('when called', async () => {
      const { client, socket } = await connectAndOpen()

      client.delete('/users/123')

      const sent = JSON.parse(socket.sent[0])

      expect(sent).toStrictEqual({
        id: sent.id,
        clientId: sent.clientId,
        type: MessageType.Request,
        method: 'DELETE',
        route: '/users/123',
        timestamp: TIMESTAMP,
        query: {},
        headers: {},
        body: null,
      })
    })
  })

  describe('get()', () => {
    test('when opts.headers is not a Headers instance', async () => {
      const { client } = await connectAndOpen()

      /* deliberately invalid: the guard under test is a runtime one */
      // @ts-expect-error
      const fn = () => client.get('/', { headers: {} })

      await expect(fn).toThrow(
        new TypeError('opts.headers must be a Headers instance'),
      )
    })

    test('when timeout occurs', async () => {
      const { client, socket } = await connectAndOpen()
      const promise = client.get('/')
      const sent = JSON.parse(socket.sent[0])

      jest.advanceTimersByTime(30_000)

      expect(sent).toStrictEqual({
        id: sent.id,
        clientId: sent.clientId,
        type: MessageType.Request,
        method: 'GET',
        route: '/',
        timestamp: TIMESTAMP,
        query: {},
        headers: {},
        body: null,
      })

      await expect(promise).rejects.toThrow(new Error('Request timed out.'))
    })

    test('when a drop rejects an in-flight request', async () => {
      const { client, socket } = await connectAndOpen({
        reconnect: {
          random: () => 0,
        },
      })

      const promise = client.get('/')

      socket.drop()

      await expect(promise).rejects.toThrow(new Error('Socket closed.'))
    })

    test('when malformed response comes back (missing ID)', async () => {
      const { client, socket } = await connectAndOpen()
      const promise = client.get('/')
      const sent = JSON.parse(socket.sent[0])

      socket.receive({
        type: MessageType.Response,
        status: StatusCode.Ok,
        timestamp: TIMESTAMP,
        headers: {},
        body: { userId: '123' },
      })

      jest.advanceTimersByTime(30_000)

      expect(sent).toStrictEqual({
        id: sent.id,
        clientId: sent.clientId,
        type: MessageType.Request,
        method: 'GET',
        route: '/',
        timestamp: TIMESTAMP,
        query: {},
        headers: {},
        body: null,
      })

      await expect(promise).rejects.toThrow(new Error('Request timed out.'))
    })

    test('when successful', async () => {
      const { client, socket } = await connectAndOpen()
      const promise = client.get('/')
      const sent = JSON.parse(socket.sent[0])

      socket.receive(response(sent.id, { userId: '123' }))

      const res = await promise

      expect(sent).toStrictEqual({
        id: sent.id,
        clientId: sent.clientId,
        type: MessageType.Request,
        method: 'GET',
        route: '/',
        timestamp: TIMESTAMP,
        query: {},
        headers: {},
        body: null,
      })

      expect(res).toStrictEqual({
        id: sent.id,
        clientId: CLIENT_ID,
        type: MessageType.Response,
        status: StatusCode.Ok,
        timestamp: TIMESTAMP,
        headers: {},
        body: { userId: '123' },
      })
    })

    test('when opts.query is provided', async () => {
      const { client, socket } = await connectAndOpen()

      client.get('/', {
        query: {
          page: '2',
        },
      })

      const sent = JSON.parse(socket.sent[0])

      expect(sent.query).toStrictEqual({
        page: '2',
      })
    })

    test('when opts.headers carries multiple entries', async () => {
      const { client, socket } = await connectAndOpen()

      client.get('/', {
        headers: new Headers({
          authorization: 'Bearer xyz',
          'x-request-id': 'abc',
        }),
      })

      const sent = JSON.parse(socket.sent[0])

      expect(sent.headers).toStrictEqual({
        authorization: 'Bearer xyz',
        'x-request-id': 'abc',
      })
    })

    test('when opts.body is an object', async () => {
      const { client, socket } = await connectAndOpen()

      client.get('/', {
        body: {
          userId: '123',
        },
      })

      const sent = JSON.parse(socket.sent[0])

      expect(sent).toStrictEqual({
        id: sent.id,
        clientId: sent.clientId,
        type: MessageType.Request,
        method: 'GET',
        route: '/',
        timestamp: TIMESTAMP,
        query: {},
        headers: {
          'content-type': 'application/json;charset=utf-8',
        },
        body: {
          userId: '123',
        },
      })
    })

    test('when opts.headers already sets content-type', async () => {
      const { client, socket } = await connectAndOpen()

      client.get('/', {
        headers: new Headers({
          'content-type': 'text/plain',
        }),
        body: {
          userId: '123',
        },
      })

      const sent = JSON.parse(socket.sent[0])

      expect(sent.headers).toStrictEqual({
        'content-type': 'text/plain',
      })
    })

    test('when opts.body is a primitive', async () => {
      const { client, socket } = await connectAndOpen()

      client.get('/', { body: 42 })

      const sent = JSON.parse(socket.sent[0])

      expect(sent).toStrictEqual({
        id: sent.id,
        clientId: sent.clientId,
        type: MessageType.Request,
        method: 'GET',
        route: '/',
        timestamp: TIMESTAMP,
        query: {},
        headers: {},
        body: 42,
      })
    })

    test('when calls respond out-of-order (queue = NONE)', async () => {
      const { client, socket } = await connectAndOpen({ queue: Queue.None })

      const order: number[] = []
      const p1 = client.get('/a').then(() => order.push(1))
      const p2 = client.get('/b').then(() => order.push(2))
      const p3 = client.get('/c').then(() => order.push(3))

      const [id1, id2, id3] = socket.sent.map(raw => JSON.parse(raw).id)

      await flush()

      socket.receive(response(id2, null))
      socket.receive(response(id1, null))
      socket.receive(response(id3, null))

      await Promise.all([p1, p2, p3])

      expect(order).toEqual([2, 1, 3])
    })

    test('when calls respond out-of-order (queue = FIFO)', async () => {
      const { client, socket } = await connectAndOpen({ queue: Queue.Fifo })

      const order: number[] = []
      const p1 = client.get('/a').then(() => order.push(1))
      const p2 = client.get('/b').then(() => order.push(2))
      const p3 = client.get('/c').then(() => order.push(3))

      const [id1, id2, id3] = socket.sent.map(raw => JSON.parse(raw).id)

      await flush()

      socket.receive(response(id2, null))
      socket.receive(response(id1, null))
      socket.receive(response(id3, null))

      await Promise.all([p1, p2, p3])

      expect(order).toEqual([1, 2, 3])
    })

    test('when calls respond out-of-order (queue = LIFO)', async () => {
      const { client, socket } = await connectAndOpen({ queue: Queue.Lifo })

      const order: number[] = []
      const p1 = client.get('/a').then(() => order.push(1))
      const p2 = client.get('/b').then(() => order.push(2))
      const p3 = client.get('/c').then(() => order.push(3))

      const [id1, id2, id3] = socket.sent.map(raw => JSON.parse(raw).id)

      await flush()

      socket.receive(response(id2, null))
      socket.receive(response(id1, null))
      socket.receive(response(id3, null))

      await Promise.all([p1, p2, p3])

      expect(order).toEqual([3, 2, 1])
    })
  })
})
