import SleepySocketClient, { QUEUE, TYPES } from './'

import {
  jest,
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
} from 'bun:test'

const TIMESTAMP = '2000-01-01T00:00:00.000Z'

class MockWebSocket {
  static last = null

  url = null
  readyState = 0
  sent = []

  #listeners = {
    open: [],
    close: [],
    error: [],
    message: [],
  }

  constructor(url) {
    this.url = url

    MockWebSocket.last = this
  }

  #emit(type, event) {
    for (const listener of [...this.#listeners[type]]) {
      listener(event)
    }
  }

  addEventListener(type, callback, options = {}) {
    const listener = options.once
      ? event => {
        this.removeEventListener(type, listener)
        callback(event)
      }
      : callback

    this.#listeners[type].push(listener)
  }

  removeEventListener(type, callback) {
    this.#listeners[type] = this.#listeners[type].filter(item => item !== callback)
  }

  send(data) {
    this.sent.push(data)
  }

  close() {
    this.readyState = 3
    this.#emit('close', { wasClean: true, code: 1000 })
  }

  /* test controls */

  open() {
    this.readyState = 1
    this.#emit('open', {})
  }

  receive(payload) {
    this.#emit('message', {
      data: JSON.stringify(payload),
    })
  }

  error(event = {}) {
    this.#emit('error', event)
  }

  /* simulate an abnormal closure (e.g. network drop, server crash) */

  drop(code = 1006) {
    this.readyState = 3
    this.#emit('close', { wasClean: false, code })
  }
}

/* connect the client and immediately drive the socket open */

async function connectAndOpen(opts) {
  const promise = SleepySocketClient.connect('localhost', 3000, opts)

  MockWebSocket.last.open()

  return {
    client: await promise,
    socket: MockWebSocket.last,
  }
}

/*
  settle each send()'s async wrapper before responses land, mirroring real
  usage where responses arrive as separate socket events (separate turns)
 */

const flush = () => Promise.resolve()

/* build a response frame that correlates to a sent request id */

function response(id, body = null) {
  return {
    id,
    type: TYPES.RESPONSE,
    status: 200,
    timestamp: TIMESTAMP,
    headers: {},
    body,
  }
}

let OriginalWebSocket = null

beforeEach(() => {
  OriginalWebSocket = globalThis.WebSocket
  globalThis.WebSocket = MockWebSocket

  MockWebSocket.last = null
})

afterEach(() => {
  globalThis.WebSocket = OriginalWebSocket
})

describe('SleepySocketClient', () => {
  describe('.connect()', () => {
    test('when "opts.queue" is invalid', async () => {
      const promise = SleepySocketClient.connect('localhost', 3000, {
        queue: 'nope',
      })

      await expect(promise).rejects.toThrow(RangeError)
    })

    test('when connecting to a server fails', async () => {
      const promise = SleepySocketClient.connect('localhost', 3000)

      MockWebSocket.last.error()

      await expect(promise).rejects.toThrow('Connection failed.')
    })

    test('when connecting to a server times out', async () => {
      const promise = SleepySocketClient.connect('localhost', 3000)

      jest.advanceTimersByTime(30_000)

      await expect(promise).rejects.toThrow('Connection timed out.')
    })

    test('when successful', async () => {
      const { client } = await connectAndOpen()

      expect(client.queueType).toBe(QUEUE.NONE)
      expect(client.secure).toBe(false)
      expect(client.timeout).toBe(30)
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
      expect(socket.url).toBe('wss://localhost:3000/ws')
    })

    test('when "opts.timeout" is set', async () => {
      const { client } = await connectAndOpen({
        timeout: 60,
      })

      expect(client.timeout).toBe(60)
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
      const fn = () => client.send({ method: 'GET', route: '/' })

      expect(client.isConnected).toBe(true)

      await client.close()

      expect(client.isConnected).toBe(false)

      await expect(fn).toThrow('socket is closed')
    })

    test('when the socket closes unexpectedly', async () => {
      const { socket } = await connectAndOpen()
      const fn = () => socket.drop()

      expect(fn).toThrow('Socket closed unexpectedly (code: 1006).')
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
        type: TYPES.REQUEST,
        method: 'GET',
        route: '/',
        timestamp: TIMESTAMP,
        query: {},
        headers: {},
        body: null,
      })

      await expect(promise).rejects.toThrow('Request timed out.')
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
        type: TYPES.REQUEST,
        method: 'GET',
        route: '/',
        timestamp: TIMESTAMP,
        query: {},
        headers: {},
        body: null,
      })

      await expect(promise).rejects.toThrow('Request timed out.')
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

    test('when multiple calls respond out-of-order (queue = NONE)', async () => {
      const { client, socket } = await connectAndOpen({ queue: QUEUE.NONE })

      const order = []
      const p1 = client.send({ method: 'GET', route: '/a' }).then(() => order.push(1))
      const p2 = client.send({ method: 'GET', route: '/b' }).then(() => order.push(2))
      const p3 = client.send({ method: 'GET', route: '/c' }).then(() => order.push(3))

      const [id1, id2, id3] = socket.sent.map(raw => JSON.parse(raw).id)

      await flush()

      socket.receive(response(id2))
      socket.receive(response(id1))
      socket.receive(response(id3))

      await Promise.all([p1, p2, p3])

      expect(order).toEqual([2, 1, 3])
    })

    test('when multiple calls respond out-of-order (queue = FIFO)', async () => {
      const { client, socket } = await connectAndOpen({ queue: QUEUE.FIFO })

      const order = []
      const p1 = client.send({ method: 'GET', route: '/a' }).then(() => order.push(1))
      const p2 = client.send({ method: 'GET', route: '/b' }).then(() => order.push(2))
      const p3 = client.send({ method: 'GET', route: '/c' }).then(() => order.push(3))

      const [id1, id2, id3] = socket.sent.map(raw => JSON.parse(raw).id)

      await flush()

      socket.receive(response(id2))
      socket.receive(response(id1))
      socket.receive(response(id3))

      await Promise.all([p1, p2, p3])

      expect(order).toEqual([1, 2, 3])
    })

    test('when multiple calls respond out-of-order (queue = LIFO)', async () => {
      const { client, socket } = await connectAndOpen({ queue: QUEUE.LIFO })

      const order = []
      const p1 = client.send({ method: 'GET', route: '/a' }).then(() => order.push(1))
      const p2 = client.send({ method: 'GET', route: '/b' }).then(() => order.push(2))
      const p3 = client.send({ method: 'GET', route: '/c' }).then(() => order.push(3))

      const [id1, id2, id3] = socket.sent.map(raw => JSON.parse(raw).id)

      await flush()

      socket.receive(response(id2))
      socket.receive(response(id1))
      socket.receive(response(id3))

      await Promise.all([p1, p2, p3])

      expect(order).toEqual([3, 2, 1])
    })
  })
})
