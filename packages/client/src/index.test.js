import * as uuid from 'uuid'
import SleepySocketClient, { QUEUE, TYPES } from './'

import {
  jest,
  mock,
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
} from 'bun:test'

const CLIENT_ID = '11111111-1111-4111-8111-111111111111'
const OTHER_CLIENT_ID = '22222222-2222-4222-8222-222222222222'
const TIMESTAMP = '2000-01-01T00:00:00.000Z'
const HEARTBEAT_INTERVAL = 30_000
const SERVER_TIMEOUT = 120_000
const TICKET = 'test-ticket'
const TOKEN = 'test-token'

class MockWebSocket {
  static last = null

  readyState = 0
  url = null
  sent = []

  #listeners = {
    open: [],
    close: [],
    error: [],
    message: [],
  }

  constructor (url) {
    this.url = url

    MockWebSocket.last = this
  }

  #emit (type, event) {
    for (const listener of [...this.#listeners[type]]) {
      listener(event)
    }
  }

  addEventListener (type, callback, options = {}) {
    const listener = options.once
      ? event => {
        this.removeEventListener(type, listener)
        callback(event)
      }
      : callback

    this.#listeners[type].push(listener)
  }

  removeEventListener (type, callback) {
    this.#listeners[type] = this.#listeners[type].filter(item => (
      item !== callback
    ))
  }

  send (data) {
    this.sent.push(data)
  }

  close () {
    this.readyState = 3

    this.#emit('close', {
      wasClean: true,
      code: 1000,
    })
  }

  /* test controls */

  open () {
    this.readyState = 1
    this.#emit('open', {})
  }

  error (event = {}) {
    this.#emit('error', event)
  }

  receive (payload) {
    this.#emit('message', {
      data: JSON.stringify(payload),
    })
  }

  /* simulate an abnormal closure (e.g. network drop, server crash) */

  drop (code = 1006) {
    this.readyState = 3

    this.#emit('close', {
      wasClean: false,
      code,
    })
  }
}

function sendWelcome (clientId) {
  return {
    id: uuid.v4(),
    clientId,
    type: TYPES.WELCOME,
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

function mockTicketFetch () {
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

async function connectAndOpen (opts) {
  const promise = SleepySocketClient.connect('localhost', 3000, opts)

  await settle()

  MockWebSocket.last.open()
  MockWebSocket.last.receive(sendWelcome(CLIENT_ID))

  return {
    client: await promise,
    socket: MockWebSocket.last,
  }
}

/* fire the backoff timer, then welcome the new socket */

async function reconnect (delay = 500, clientId = CLIENT_ID) {
  jest.advanceTimersByTime(delay)

  await settle()

  MockWebSocket.last.open()
  MockWebSocket.last.receive(sendWelcome(clientId))

  await settle()

  return MockWebSocket.last
}

/* build a response frame that correlates to a sent request id */

function response (id, body) {
  return {
    id,
    type: TYPES.RESPONSE,
    status: 200,
    timestamp: TIMESTAMP,
    headers: {},
    body,
  }
}

/* build a server-initiated notification frame */

function notification (event, body) {
  return {
    id: uuid.v4(),
    clientId: CLIENT_ID,
    type: TYPES.NOTIFICATION,
    event,
    timestamp: TIMESTAMP,
    headers: {},
    body,
  }
}

let OriginalWebSocket = null
let OriginalFetch = null

beforeEach(() => {
  OriginalWebSocket = globalThis.WebSocket
  OriginalFetch = globalThis.fetch
  globalThis.WebSocket = MockWebSocket
  globalThis.fetch = mockTicketFetch()

  MockWebSocket.last = null
})

afterEach(() => {
  globalThis.WebSocket = OriginalWebSocket
  globalThis.fetch = OriginalFetch
})

describe('SleepySocketClient', () => {
  describe('.connect()', () => {
    test('when "opts.queue" is invalid', async () => {
      const promise = SleepySocketClient.connect('localhost', 3000, {
        queue: 'nope',
      })

      await expect(promise).rejects.toThrow(RangeError)
    })

    test('when the ticket request fails', async () => {
      globalThis.fetch = mock(async () => {
        throw new Error('Down')
      })

      const promise = SleepySocketClient.connect('localhost', 3000)

      await expect(promise).rejects.toThrow(new Error('Connection failed.'))
    })

    test('when connecting to a server fails', async () => {
      const promise = SleepySocketClient.connect('localhost', 3000)

      await settle()

      MockWebSocket.last.error()

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

      MockWebSocket.last.open()

      jest.advanceTimersByTime(30_000)

      await expect(promise).rejects.toThrow(new Error('Connection timed out.'))
    })

    test('when the first frame is not a welcome', async () => {
      const promise = SleepySocketClient.connect('localhost', 3000)

      await settle()

      MockWebSocket.last.open()

      MockWebSocket.last.receive({
        type: TYPES.RESPONSE,
      })

      await expect(promise).rejects.toThrow(
        new Error('Expected a welcome message.'),
      )
    })

    test('when successful', async () => {
      const { client, socket } = await connectAndOpen()

      expect(client.isConnected).toBe(true)
      expect(client.queueType).toBe(QUEUE.NONE)
      expect(client.secure).toBe(false)
      expect(client.timeout).toBe(30_000)
      expect(client.heartbeatInterval).toBe(30_000)
      expect(client.serverTimeout).toBe(120_000)
      expect(client.clientId).toBe(CLIENT_ID)
      expect(client.token).toBe(TOKEN)
      expect(client.socket).toBe(socket)

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

      expect(client.clientId).toBe(CLIENT_ID)
      expect(client.heartbeatInterval).toBe(HEARTBEAT_INTERVAL)
    })

    test('when "opts.queue" is set', async () => {
      const { client } = await connectAndOpen({
        queue: QUEUE.FIFO,
      })

      expect(client.queueType).toBe(QUEUE.FIFO)
    })

    test('when "opts.secure" is set', async () => {
      const { client, socket } = await connectAndOpen({
        secure: true,
      })

      expect(client.secure).toBe(true)
      expect(socket.url).toBe(`wss://localhost:3000/ws?ticket=${TICKET}`)
    })

    test('when "opts.timeout" is set', async () => {
      const { client } = await connectAndOpen({
        timeout: 60_000,
      })

      expect(client.timeout).toBe(60_000)
    })
  })

  describe('close()', () => {
    test('when failed', async () => {
      const { client } = await connectAndOpen()

      await client.close()

      await expect(client.close()).rejects.toThrow()
    })

    test('when successful', async () => {
      const { client } = await connectAndOpen()

      const fn = () => client.send({
        method: 'GET',
        route: '/',
      })

      expect(client.isConnected).toBe(true)

      await client.close()

      expect(client.isConnected).toBe(false)

      await expect(fn).toThrow(new Error('Socket is closed'))
    })

    test('when reconnect is disabled and the socket drops', async () => {
      const { socket } = await connectAndOpen({
        reconnect: false,
      })

      const fn = () => socket.drop()

      expect(fn).toThrow(new Error('Socket closed unexpectedly (code: 1006).'))
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
        type: TYPES.HEARTBEAT,
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
    test('when the socket drops unexpectedly', async () => {
      const { socket } = await connectAndOpen({
        reconnect: {
          random: () => 0,
        },
      })

      socket.drop()

      const next = await reconnect()

      expect(next).not.toBe(socket)
    })

    test('when a clean close was not app-initiated', async () => {
      const { socket } = await connectAndOpen({
        reconnect: {
          random: () => 0,
        },
      })

      socket.close()

      const next = await reconnect()

      expect(next).not.toBe(socket)
    })

    test('when the app closes the client', async () => {
      const { client, socket } = await connectAndOpen({
        reconnect: {
          random: () => 0,
        },
      })

      await client.close()

      jest.advanceTimersByTime(HEARTBEAT_INTERVAL)

      await settle()

      expect(MockWebSocket.last).toBe(socket)
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
      const { client, socket } = await connectAndOpen({
        reconnect: {
          random: () => 0,
        },
      })

      socket.drop()

      const postDropStatus = client.isConnected

      await reconnect()

      expect(postDropStatus).toBe(false)
      expect(client.isConnected).toBe(true)
      expect(client.queueType).toBe(QUEUE.NONE)
      expect(client.secure).toBe(false)
      expect(client.timeout).toBe(30_000)
      expect(client.heartbeatInterval).toBe(30_000)
      expect(client.serverTimeout).toBe(120_000)
      expect(client.clientId).toBe(CLIENT_ID)
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
    })

    test('when the PUT reclaim fails', async () => {
      const { socket } = await connectAndOpen({
        reconnect: {
          random: () => 0,
        },
      })

      globalThis.fetch = mock(async (_url, options) => ({
        ok: options.method === 'POST',
        json: async () => ({
          ticket: TICKET,
          clientId: OTHER_CLIENT_ID,
        }),
      }))

      socket.drop()

      jest.advanceTimersByTime(500)

      await settle()
      await settle()

      MockWebSocket.last.open()
      MockWebSocket.last.receive(sendWelcome(OTHER_CLIENT_ID))

      await settle()

      const methods = globalThis.fetch.mock.calls.map(
        ([, opts]) => opts.method,
      )

      expect(methods).toStrictEqual(['PUT', 'POST'])
    })

    test('when the welcome returns the same clientId', async () => {
      const { client, socket } = await connectAndOpen({
        reconnect: {
          random: () => 0,
        },
      })

      socket.drop()

      await reconnect()

      expect(client.clientId).toBe(CLIENT_ID)
    })

    test('when the welcome returns a new clientId', async () => {
      const { client, socket } = await connectAndOpen({
        reconnect: {
          random: () => 0,
        },
      })

      socket.drop()

      await reconnect(500, OTHER_CLIENT_ID)

      expect(client.clientId).toBe(OTHER_CLIENT_ID)
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

      MockWebSocket.last.open()

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

      const before = globalThis.fetch.mock.calls.length

      socket.drop()

      jest.advanceTimersByTime(499)

      await settle()

      expect(globalThis.fetch.mock.calls.length).toBe(before)

      jest.advanceTimersByTime(1)

      await settle()

      expect(globalThis.fetch.mock.calls.length).toBe(before + 1)
    })

    test('when an attempt fails', async () => {
      const { socket } = await connectAndOpen({
        reconnect: {
          random: () => 0,
          minDelay: 500,
          factor: 2,
        },
      })

      globalThis.fetch = mock(async () => {
        throw new Error('Down')
      })

      socket.drop()

      jest.advanceTimersByTime(500)

      await settle()

      const after = globalThis.fetch.mock.calls.length

      jest.advanceTimersByTime(999)

      await settle()

      expect(globalThis.fetch.mock.calls.length).toBe(after)

      jest.advanceTimersByTime(1)

      await settle()

      expect(globalThis.fetch.mock.calls.length).toBe(after + 1)
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

      globalThis.fetch = mock(async () => {
        throw new Error('Down')
      })

      socket.drop()

      jest.advanceTimersByTime(500)

      await settle()

      jest.advanceTimersByTime(1_000)

      await settle()

      const after = globalThis.fetch.mock.calls.length

      jest.advanceTimersByTime(1_000)

      await settle()

      expect(globalThis.fetch.mock.calls.length).toBe(after + 1)
    })

    test('when jitter is applied, the delay stays within bounds', async () => {
      const { socket } = await connectAndOpen({
        reconnect: {
          random: () => 1,
          minDelay: 500,
        },
      })

      const before = globalThis.fetch.mock.calls.length

      socket.drop()

      jest.advanceTimersByTime(749)

      await settle()

      expect(globalThis.fetch.mock.calls.length).toBe(before)

      jest.advanceTimersByTime(1)

      await settle()

      expect(globalThis.fetch.mock.calls.length).toBe(before + 1)
    })
  })

  describe('notification', () => {
    test('when a notification arrives', async () => {
      const { client, socket } = await connectAndOpen()
      const message = notification('state_changed', { score: 1 })
      const received = []

      client.on('notification', message => received.push(message))
      socket.receive(message)

      expect(received).toStrictEqual([message])
    })

    test('when a handler is removed with off()', async () => {
      const { client, socket } = await connectAndOpen()
      const handler = message => received.push(message)
      const received = []

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

  describe('#handleMessage()', () => {
    test('when an unknown message type arrives', async () => {
      const { socket } = await connectAndOpen()

      const fn = () => socket.receive({
        id: uuid.v4(),
        type: 'garbage',
        timestamp: TIMESTAMP,
      })

      expect(fn).toThrow(RangeError)
    })
  })

  describe('send()', () => {
    test('when timeout occurs', async () => {
      const { client, socket } = await connectAndOpen()

      const promise = client.send({
        method: 'GET',
        route: '/',
      })

      const sent = JSON.parse(socket.sent[0])

      jest.advanceTimersByTime(30_000)

      expect(sent).toStrictEqual({
        id: sent.id,
        clientId: sent.clientId,
        type: TYPES.REQUEST,
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

      const promise = client.send({
        method: 'GET',
        route: '/',
      })

      socket.drop()

      await expect(promise).rejects.toThrow(new Error('Socket closed.'))
    })

    test('when malformed response comes back (missing ID)', async () => {
      const { client, socket } = await connectAndOpen()

      const promise = client.send({
        method: 'GET',
        route: '/',
      })

      const sent = JSON.parse(socket.sent[0])

      socket.receive({
        type: TYPES.RESPONSE,
        status: 200,
        timestamp: TIMESTAMP,
        headers: {},
        body: { userId: '123' },
      })

      jest.advanceTimersByTime(30_000)

      expect(sent).toStrictEqual({
        id: sent.id,
        clientId: sent.clientId,
        type: TYPES.REQUEST,
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

      const promise = client.send({
        method: 'GET',
        route: '/',
      })

      const sent = JSON.parse(socket.sent[0])

      socket.receive(response(sent.id, { userId: '123' }))

      const res = await promise

      expect(sent).toStrictEqual({
        id: sent.id,
        clientId: sent.clientId,
        type: TYPES.REQUEST,
        method: 'GET',
        route: '/',
        timestamp: TIMESTAMP,
        query: {},
        headers: {},
        body: null,
      })

      expect(res).toStrictEqual({
        id: sent.id,
        type: TYPES.RESPONSE,
        status: 200,
        timestamp: TIMESTAMP,
        headers: {},
        body: { userId: '123' },
      })
    })

    test('when calls respond out-of-order (queue = NONE)', async () => {
      const { client, socket } = await connectAndOpen({ queue: QUEUE.NONE })
      const order = []

      const p1 = client.send({
        method: 'GET',
        route: '/a',
      }).then(() => order.push(1))

      const p2 = client.send({
        method: 'GET',
        route: '/b',
      }).then(() => order.push(2))

      const p3 = client.send({
        method: 'GET',
        route: '/c',
      }).then(() => order.push(3))

      const [id1, id2, id3] = socket.sent.map(raw => JSON.parse(raw).id)

      await flush()

      socket.receive(response(id2, null))
      socket.receive(response(id1, null))
      socket.receive(response(id3, null))

      await Promise.all([p1, p2, p3])

      expect(order).toEqual([2, 1, 3])
    })

    test('when calls respond out-of-order (queue = FIFO)', async () => {
      const { client, socket } = await connectAndOpen({ queue: QUEUE.FIFO })

      const order = []

      const p1 = client.send({
        method: 'GET',
        route: '/a',
      }).then(() => order.push(1))

      const p2 = client.send({
        method: 'GET',
        route: '/b',
      }).then(() => order.push(2))

      const p3 = client.send({
        method: 'GET',
        route: '/c',
      }).then(() => order.push(3))

      const [id1, id2, id3] = socket.sent.map(raw => JSON.parse(raw).id)

      await flush()

      socket.receive(response(id2, null))
      socket.receive(response(id1, null))
      socket.receive(response(id3, null))

      await Promise.all([p1, p2, p3])

      expect(order).toEqual([1, 2, 3])
    })

    test('when calls respond out-of-order (queue = LIFO)', async () => {
      const { client, socket } = await connectAndOpen({ queue: QUEUE.LIFO })

      const order = []

      const p1 = client.send({
        method: 'GET',
        route: '/a',
      }).then(() => order.push(1))

      const p2 = client.send({
        method: 'GET',
        route: '/b',
      }).then(() => order.push(2))

      const p3 = client.send({
        method: 'GET',
        route: '/c',
      }).then(() => order.push(3))

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
