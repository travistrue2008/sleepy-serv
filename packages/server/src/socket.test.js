import crypto from 'node:crypto'
import { TYPES } from './messages'

import {
  jest,
  mock,
  spyOn,
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
} from 'bun:test'

import {
  buildSocketRoutes,
  buildSocketHandlers,
} from './socket'

import {
  RequestError,
  NotFoundError,
  UnauthorizedError,
  MethodNotAllowedError,
  UnprocessableContentError,
  InternalServerError,
} from './errors'

const ID = crypto.randomUUID()
const CLIENT_ID = crypto.randomUUID()
const METHOD = 'GET'
const TIMESTAMP = '2000-01-01T00:00:00.000Z'

const BYTES = {
  24: Buffer.alloc(24, 1),
  32: Buffer.alloc(32, 1),
}

const BASE64_24 = BYTES[24].toString('base64url')
const BASE64_32 = BYTES[32].toString('base64url')

const UUIDs = [
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-0000-0000-000000000001',
]

function buildSocket (clientId) {
  const send = mock()

  return {
    send,
    close: mock(),
    data: {
      clientId,
    },
    get welcome () {
      return JSON.parse(send.mock.calls[0][0])
    },
  }
}

function buildRequest (method, opts = {}) {
  const body = opts.body || undefined
  const query = opts.query || {}
  const searchParams = new URLSearchParams(query)
  const url = ['http://localhost/ws', searchParams.toString()].join('?')
  const json = () => new Promise(resolve => resolve(body))

  return {
    method,
    url,
    json,
  }
}

function buildPutRequest (token) {
  const rawHeaders = token !== undefined
    ? { 'authorization': `Bearer ${token}` }
    : {}

  return {
    method: 'PUT',
    url: `http://localhost/ws/${CLIENT_ID}`,
    headers: new Headers(rawHeaders),
    params: {
      clientId: CLIENT_ID,
    },
  }
}

class TestError extends RequestError {
  static get status () { return 999 }

  get output () {
    return {
      custom: 1,
      message: this.message,
    }
  }

  constructor () {
    super('This is a test')

    this.name = 'TestError'
  }
}

describe('buildSocketRoutes()', () => {
  const fnA = () => { }
  const fnB = () => { }
  const fnC = () => { }
  const fnD = () => { }
  const fnE = () => { }
  const fnF = () => { }

  test('when only the root is provided: /', () => {
    const result = buildSocketRoutes([
      {
        method: 'GET',
        path: '/',
        handler: fnA,
        middlewareChain: [fnB],
      },
    ])

    expect(result).toStrictEqual([
      {
        method: 'GET',
        patternSegments: [],
        middlewareChain: [fnB],
      },
    ])
  })

  test('when only top-level route provided: /users', () => {
    const result = buildSocketRoutes([
      {
        method: 'GET',
        path: '/users',
        handler: fnA,
        middlewareChain: [fnB],
      },
    ])

    expect(result).toStrictEqual([
      {
        method: 'GET',
        patternSegments: ['users'],
        middlewareChain: [fnB],
      },
    ])
  })

  test('when only top-level route provided: /users/:userId', () => {
    const result = buildSocketRoutes([
      {
        method: 'GET',
        path: '/users/:userId',
        handler: fnA,
        middlewareChain: [fnB],
      },
    ])

    expect(result).toStrictEqual([
      {
        method: 'GET',
        patternSegments: ['users', ':userId'],
        middlewareChain: [fnB],
      },
    ])
  })

  test('when multiple items are provided', () => {
    const result = buildSocketRoutes([
      {
        method: 'GET',
        path: '/users/:userId',
        handler: fnD,
        middlewareChain: [fnE, fnF],
      },
      {
        method: 'GET',
        path: '/users',
        handler: fnB,
        middlewareChain: [fnC],
      },
      {
        method: 'GET',
        path: '/',
        handler: fnA,
        middlewareChain: [],
      },
    ])

    expect(result).toStrictEqual([
      {
        method: 'GET',
        patternSegments: ['users', ':userId'],
        middlewareChain: [fnE, fnF],
      },
      {
        method: 'GET',
        patternSegments: ['users'],
        middlewareChain: [fnC],
      },
      {
        method: 'GET',
        patternSegments: [],
        middlewareChain: [],
      },
    ])
  })
})

describe('buildSocketHandlers()', () => {
  beforeEach(() => {
    spyOn(crypto, 'randomBytes').mockImplementation(b => BYTES[b])
    spyOn(crypto, 'randomUUID')

    UUIDs.forEach((_, index) =>
      crypto.randomUUID.mockReturnValueOnce(UUIDs[index]))
  })

  afterEach(() => {
    mock.restore()
  })

  describe('message()', () => {
    const HEADERS = new Headers({
      'content-type': 'application/json;charset=utf-8',
    })

    test('when parsing incoming message fails', async () => {
      const ws = buildSocket(CLIENT_ID)

      const { server } = buildSocketHandlers([
        {
          method: METHOD,
          patternSegments: [],
          middlewareChain: [],
        },
      ])

      await server.message(ws, 'invalid json')

      expect(ws.send).not.toHaveBeenCalled()
    })

    describe(`"type" = "${TYPES.HEARTBEAT}"`, () => {
      test('when a heartbeat message is received', async () => {
        const ws = buildSocket(CLIENT_ID)
        const { server } = buildSocketHandlers([])

        await server.message(ws, JSON.stringify({
          id: ID,
          clientId: CLIENT_ID,
          type: TYPES.HEARTBEAT,
          timestamp: TIMESTAMP,
        }))

        expect(ws.welcome).toStrictEqual({
          id: ID,
          clientId: CLIENT_ID,
          type: TYPES.HEARTBEAT,
          timestamp: TIMESTAMP,
        })
      })
    })

    describe(`"type" = "${TYPES.REQUEST}"`, () => {
      test('when validation fails', async () => {
        const incomingMessage = JSON.stringify({
          id: 'invalid',
          clientId: CLIENT_ID,
          type: TYPES.REQUEST,
          method: METHOD,
          route: '/',
          timestamp: TIMESTAMP,
          headers: {},
          query: {},
          body: null,
        })

        const ws = buildSocket(CLIENT_ID)

        const { server } = buildSocketHandlers([
          {
            method: METHOD,
            patternSegments: [],
            middlewareChain: [],
          },
        ])

        await server.message(ws, incomingMessage)

        expect(ws.welcome).toStrictEqual({
          id: 'invalid',
          clientId: CLIENT_ID,
          type: TYPES.RESPONSE,
          status: UnprocessableContentError.status,
          timestamp: TIMESTAMP,
          headers: {
            'content-type': 'application/json;charset=utf-8',
          },
          body: [
            {
              path: 'id',
              message: 'must match format "uuid"',
            },
          ],
        })
      })

      test('when message does NOT match any routes', async () => {
        const incomingMessage = JSON.stringify({
          id: ID,
          clientId: CLIENT_ID,
          type: TYPES.REQUEST,
          method: METHOD,
          route: '/users',
          timestamp: TIMESTAMP,
          headers: HEADERS,
          query: {},
          body: null,
        })

        const ws = buildSocket(CLIENT_ID)

        const { server } = buildSocketHandlers([
          {
            method: METHOD,
            patternSegments: [],
            middlewareChain: [],
          },
        ])

        await server.message(ws, incomingMessage)

        expect(ws.welcome).toStrictEqual({
          id: ID,
          clientId: CLIENT_ID,
          type: TYPES.RESPONSE,
          status: NotFoundError.status,
          timestamp: TIMESTAMP,
          headers: {
            'content-type': 'application/json;charset=utf-8',
          },
          body: null,
        })
      })

      test('when message does NOT match any methods', async () => {
        const incomingMessage = JSON.stringify({
          id: ID,
          clientId: CLIENT_ID,
          type: TYPES.REQUEST,
          method: 'POST',
          route: '/users',
          timestamp: TIMESTAMP,
          headers: HEADERS,
          query: {},
          body: null,
        })

        const ws = buildSocket(CLIENT_ID)

        const { server } = buildSocketHandlers([
          {
            method: METHOD,
            patternSegments: ['users'],
            middlewareChain: [],
          },
        ])

        await server.message(ws, incomingMessage)

        expect(ws.welcome).toStrictEqual({
          id: ID,
          clientId: CLIENT_ID,
          type: TYPES.RESPONSE,
          status: MethodNotAllowedError.status,
          timestamp: TIMESTAMP,
          headers: {
            'content-type': 'application/json;charset=utf-8',
          },
          body: null,
        })
      })

      test('when middleware fails (generic Error)', async () => {
        const incomingMessage = JSON.stringify({
          id: ID,
          clientId: CLIENT_ID,
          type: TYPES.REQUEST,
          method: METHOD,
          route: '/',
          timestamp: TIMESTAMP,
          headers: HEADERS,
          query: {},
          body: null,
        })

        const ws = buildSocket(CLIENT_ID)

        const { server } = buildSocketHandlers([
          {
            method: METHOD,
            patternSegments: [],
            middlewareChain: [
              (_req, _res, _next) => {
                throw new Error('Bad')
              },
            ],
          },
        ])

        await server.message(ws, incomingMessage)

        expect(ws.welcome).toStrictEqual({
          id: ID,
          clientId: CLIENT_ID,
          type: TYPES.RESPONSE,
          status: InternalServerError.status,
          timestamp: TIMESTAMP,
          headers: {},
          body: 'Bad',
        })
      })

      test('when middleware fails (RequestError subclass)', async () => {
        const incomingMessage = JSON.stringify({
          id: ID,
          clientId: CLIENT_ID,
          type: TYPES.REQUEST,
          method: METHOD,
          route: '/',
          timestamp: TIMESTAMP,
          headers: HEADERS,
          query: {},
          body: null,
        })

        const ws = buildSocket(CLIENT_ID)

        const { server } = buildSocketHandlers([
          {
            method: METHOD,
            patternSegments: [],
            middlewareChain: [
              (_req, _res, _next) => {
                throw new TestError()
              },
            ],
          },
        ])

        await server.message(ws, incomingMessage)

        expect(ws.welcome).toStrictEqual({
          id: ID,
          clientId: CLIENT_ID,
          type: TYPES.RESPONSE,
          status: TestError.status,
          timestamp: TIMESTAMP,
          headers: {
            'content-type': 'application/json;charset=utf-8',
          },
          body: {
            custom: 1,
            message: 'This is a test',
          },
        })
      })

      test('when successful', async () => {
        const incomingMessage = JSON.stringify({
          id: ID,
          clientId: CLIENT_ID,
          type: TYPES.REQUEST,
          method: METHOD,
          route: '/users',
          timestamp: TIMESTAMP,
          headers: HEADERS,
          query: {},
          body: null,
        })

        const ws = buildSocket(CLIENT_ID)

        const { server } = buildSocketHandlers([
          {
            method: METHOD,
            patternSegments: ['users'],
            middlewareChain: [
              (_req, _res, _next) => new Response('Success'),
            ],
          },
        ])

        await server.message(ws, incomingMessage)

        expect(ws.welcome).toStrictEqual({
          id: ID,
          clientId: CLIENT_ID,
          type: TYPES.RESPONSE,
          status: 200,
          timestamp: TIMESTAMP,
          headers: {},
          body: 'Success',
        })
      })

      test('when route and method match with dynamic params', async () => {
        const incomingMessage = JSON.stringify({
          id: ID,
          clientId: CLIENT_ID,
          type: TYPES.REQUEST,
          method: METHOD,
          route: '/users/123',
          timestamp: TIMESTAMP,
          headers: HEADERS,
          query: {},
          body: null,
        })

        const ws = buildSocket(CLIENT_ID)

        const { server } = buildSocketHandlers([
          {
            method: METHOD,
            patternSegments: ['users', ':userId'],
            middlewareChain: [
              (req, _res, _next) => Response.json(req.params),
            ],
          },
        ])

        await server.message(ws, incomingMessage)

        expect(ws.welcome).toStrictEqual({
          id: ID,
          clientId: CLIENT_ID,
          type: TYPES.RESPONSE,
          status: 200,
          timestamp: TIMESTAMP,
          headers: {
            'content-type': 'application/json;charset=utf-8',
          },
          body: {
            userId: '123',
          },
        })
      })
    })
  })

  describe('open()', () => {
    test('when a client connects', () => {
      const { server } = buildSocketHandlers([], {
        ws: {
          heartbeatInterval: 20_000,
        },
      })

      const ws = buildSocket(CLIENT_ID)

      server.open(ws)

      expect(ws.welcome).toStrictEqual({
        id: ws.welcome.id,
        clientId: CLIENT_ID,
        type: TYPES.WELCOME,
        timestamp: TIMESTAMP,
        headers: {},
        body: {
          token: BASE64_32,
          heartbeatInterval: 20_000,
        },
      })
    })

    test('when the welcome carries a fresh token', () => {
      const { server } = buildSocketHandlers([])
      const ws = buildSocket(CLIENT_ID)

      server.open(ws)

      expect(ws.welcome).toStrictEqual({
        id: ws.welcome.id,
        clientId: CLIENT_ID,
        type: TYPES.WELCOME,
        timestamp: TIMESTAMP,
        headers: {},
        body: {
          heartbeatInterval: 30_000,
          token: BASE64_32,
        },
      })

      console.log('calls:', crypto.randomBytes.mock.calls.length)
    })

    test('when an existing socket for the client is registered', () => {
      const { server } = buildSocketHandlers([])
      const oldWs = buildSocket(CLIENT_ID)
      const newWs = buildSocket(CLIENT_ID)

      server.open(oldWs)
      server.open(newWs)

      expect(oldWs.data.superseded).toBe(true)
      expect(oldWs.close).toHaveBeenCalledOnce()
    })
  })

  describe('reaper', () => {
    test('when the disconnect heartbeat threshold elapses', () => {
      const { server } = buildSocketHandlers([], {
        ws: {
          disconnectThreshold: 100,
        },
      })

      const ws = buildSocket(CLIENT_ID)

      server.open(ws)
      jest.advanceTimersByTime(100)

      expect(ws.close).toHaveBeenCalledOnce()
      expect(ws.data.reaped).toBe(true)
    })

    test('when a heartbeat arrives before the threshold', async () => {
      const { server } = buildSocketHandlers([], {
        ws: {
          disconnectThreshold: 100,
        },
      })

      const ws = buildSocket(CLIENT_ID)

      server.open(ws)
      jest.advanceTimersByTime(60)

      await server.message(ws, JSON.stringify({
        type: TYPES.HEARTBEAT,
      }))

      jest.advanceTimersByTime(60)

      expect(ws.close).not.toHaveBeenCalled()

      jest.advanceTimersByTime(40)

      expect(ws.close).toHaveBeenCalledOnce()
    })

    test('when a heartbeat resets the disconnect threshold', async () => {
      const ws = buildSocket(CLIENT_ID)

      const { server } = buildSocketHandlers([], {
        ws: {
          disconnectThreshold: 100,
        },
      })

      server.open(ws)
      jest.advanceTimersByTime(90)

      expect(ws.close).not.toHaveBeenCalled()

      await server.message(ws, JSON.stringify({
        type: TYPES.HEARTBEAT,
      }))

      jest.advanceTimersByTime(90)

      expect(ws.close).not.toHaveBeenCalled()

      jest.advanceTimersByTime(110)

      expect(ws.close).toHaveBeenCalledOnce()
    })
  })

  describe('close()', () => {
    test('when the socket was superseded', async () => {
      const { endpoints, server } = buildSocketHandlers([])
      const executePUT = endpoints['/ws/:clientId'].PUT
      const oldSocket = buildSocket(CLIENT_ID)
      const newSocket = buildSocket(CLIENT_ID)

      server.open(oldSocket)
      server.close(oldSocket, 1000)
      server.open(newSocket)

      const req = buildPutRequest(newSocket.welcome.body.token)
      const res = executePUT(req)
      const result = await res.json()

      expect(result).toStrictEqual({
        clientId: CLIENT_ID,
        ticket: BASE64_24,
      })
    })

    test('when an involuntary close occurs', async () => {
      const { endpoints, server } = buildSocketHandlers([])
      const executePUT = endpoints['/ws/:clientId'].PUT
      const ws = buildSocket(CLIENT_ID)

      server.open(ws)

      const req = buildPutRequest(BASE64_32)
      const res = executePUT(req)
      const result = await res.json()

      server.close(ws, 1006)

      expect(result).toStrictEqual({
        clientId: CLIENT_ID,
        ticket: BASE64_24,
      })
    })

    test('when the reaper fired before an otherwise-clean close', async () => {
      const { endpoints, server } = buildSocketHandlers([], {
        ws: {
          disconnectThreshold: 100,
        },
      })

      const executePUT = endpoints['/ws/:clientId'].PUT
      const ws = buildSocket(CLIENT_ID)

      server.open(ws)
      jest.advanceTimersByTime(100)
      server.close(ws, 1000)

      const req = buildPutRequest(BASE64_32)
      const res = executePUT(req)
      const result = await res.json()

      expect(result).toStrictEqual({
        clientId: CLIENT_ID,
        ticket: BASE64_24,
      })
    })

    test('when the reclaim window has expired', () => {
      const { endpoints, server } = buildSocketHandlers([], {
        ws: {
          reclaimTtl: 100,
        },
      })

      const executePUT = endpoints['/ws/:clientId'].PUT
      const ws = buildSocket(CLIENT_ID)

      server.open(ws)

      const req = buildPutRequest(BASE64_32)
      const fn = () => executePUT(req)

      server.close(ws, 1006)
      jest.advanceTimersByTime(101)

      expect(fn).toThrow(NotFoundError)
    })

    test('when a willing close occurs', () => {
      const { endpoints, server } = buildSocketHandlers([])
      const executePUT = endpoints['/ws/:clientId'].PUT
      const ws = buildSocket(CLIENT_ID)

      server.open(ws)

      const req = buildPutRequest(BASE64_32)
      const fn = () => executePUT(req)

      server.close(ws, 1000)

      expect(fn).toThrow(NotFoundError)
    })
  })

  describe('endpoints', () => {
    describe('GET', () => {
      test('when the ticket is NOT in querystring', () => {
        const { endpoints } = buildSocketHandlers([])
        const executeGET = endpoints['/ws'].GET
        const req = buildRequest('GET', undefined)
        const fn = () => executeGET(req)

        expect(fn).toThrow(NotFoundError)
      })

      test('when the ticket does not exist', () => {
        const { endpoints } = buildSocketHandlers([])
        const executeGET = endpoints['/ws'].GET

        const req = buildRequest('GET', {
          query: {
            ticket: 'nope',
          },
        })

        const fn = () => executeGET(req)

        expect(fn).toThrow(NotFoundError)
      })

      test('when the same ticket is redeemed twice', async () => {
        const { endpoints } = buildSocketHandlers([])
        const executeGET = endpoints['/ws'].GET
        const executePOST = endpoints['/ws'].POST
        const res = executePOST()
        const result = await res.json()

        const req = buildRequest('GET', {
          query: {
            ticket: BASE64_24,
          },
        })

        const upgrade = mock(() => true)
        const fn = () => executeGET(req, { upgrade })

        fn() /* call first time */

        expect(fn).toThrow(NotFoundError)

        expect(upgrade).toHaveBeenCalledWith(req, {
          data: {
            clientId: UUIDs[0],
          },
        })
      })

      test('when the ticket has expired', async () => {
        const { endpoints } = buildSocketHandlers([], {
          ws: {
            ticketTtl: 100,
          },
        })

        const executeGET = endpoints['/ws'].GET
        const executePOST = endpoints['/ws'].POST
        const res = executePOST()
        const result = await res.json()

        const req = buildRequest('GET', {
          query: {
            ticket: BASE64_24,
          },
        })

        const fn = () => executeGET(req)

        jest.advanceTimersByTime(101)

        expect(fn).toThrow(NotFoundError)
      })

      test('when the upgrade is refused', async () => {
        const { endpoints } = buildSocketHandlers([])
        const executeGET = endpoints['/ws'].GET
        const executePOST = endpoints['/ws'].POST
        const res = executePOST()
        const result = await res.json()

        const req = buildRequest('GET', {
          query: {
            ticket: BASE64_24,
          },
        })

        const fn = () => executeGET(req, {
          upgrade: mock(() => false),
        })

        expect(fn).toThrow(NotFoundError)
      })

      test('when the ticket is valid', async () => {
        const { endpoints } = buildSocketHandlers([])
        const executeGET = endpoints['/ws'].GET
        const executePOST = endpoints['/ws'].POST
        const upgrade = mock(() => true)
        const res = executePOST()
        const result = await res.json()

        const req = buildRequest('GET', {
          query: {
            ticket: BASE64_24,
          },
        })

        executeGET(req, { upgrade })

        expect(upgrade).toHaveBeenCalledWith(req, {
          data: {
            clientId: UUIDs[0],
          },
        })
      })
    })

    describe('POST', () => {
      test('when called, it mints a fresh clientId and ticket', async () => {
        const { endpoints } = buildSocketHandlers([])
        const executePOST = endpoints['/ws'].POST
        const res = executePOST()
        const result = await res.json()

        expect(result).toStrictEqual({
          clientId: UUIDs[0],
          ticket: BASE64_24,
        })
      })
    })

    describe('PUT', () => {
      test('when the clientId has no session', () => {
        const { endpoints } = buildSocketHandlers([])
        const executePUT = endpoints['/ws/:clientId'].PUT
        const req = buildPutRequest('whatever')
        const fn = () => executePUT(req)

        expect(fn).toThrow(NotFoundError)
      })

      test('when the bearer token is missing', () => {
        const { endpoints, server } = buildSocketHandlers([])
        const executePUT = endpoints['/ws/:clientId'].PUT
        const ws = buildSocket(CLIENT_ID)

        server.open(ws)

        const req = buildPutRequest(undefined)
        const fn = () => executePUT(req)

        expect(fn).toThrow(UnauthorizedError)
      })

      test('when the token does not match', () => {
        const { endpoints, server } = buildSocketHandlers([])
        const executePUT = endpoints['/ws/:clientId'].PUT
        const ws = buildSocket(CLIENT_ID)

        server.open(ws)

        const req = buildPutRequest('wrong')
        const fn = () => executePUT(req)

        expect(fn).toThrow(UnauthorizedError)
      })

      test('when the clientId and token match', async () => {
        const { endpoints, server } = buildSocketHandlers([])
        const executePUT = endpoints['/ws/:clientId'].PUT
        const ws = buildSocket(CLIENT_ID)

        server.open(ws)

        const req = buildPutRequest(BASE64_32)
        const res = executePUT(req)
        const result = await res.json()

        expect(result).toStrictEqual({
          clientId: CLIENT_ID,
          ticket: BASE64_24,
        })
      })
    })
  })

  describe('commands', () => {
    describe('send()', () => {
      test('when the client has no live socket', () => {
        const { commands } = buildSocketHandlers([])

        const fn = () => commands.send(CLIENT_ID, 'state_changed', {
          ok: true,
        })

        expect(fn).toThrow(ReferenceError)
      })

      test('when the client has a live socket', () => {
        const { server, commands } = buildSocketHandlers([])
        const ws = buildSocket(CLIENT_ID)

        server.open(ws)
        commands.send(CLIENT_ID, 'state_changed', { score: 1 })

        const notification = JSON.parse(ws.send.mock.calls[1][0])

        expect(notification).toStrictEqual({
          id: notification.id,
          clientId: CLIENT_ID,
          type: TYPES.NOTIFICATION,
          timestamp: TIMESTAMP,
          event: 'state_changed',
          headers: {},
          body: {
            score: 1,
          },
        })
      })
    })

    describe('broadcast()', () => {
      const CLIENT_ID_A = '00000000-0000-0000-0000-000000000010'
      const CLIENT_ID_B = '00000000-0000-0000-0000-000000000011'

      test('when multiple clients are connected', () => {
        const { server, commands } = buildSocketHandlers([])
        const wsA = buildSocket(CLIENT_ID_A)
        const wsB = buildSocket(CLIENT_ID_B)

        server.open(wsA)
        server.open(wsB)
        commands.broadcast('player_joined', { name: 'x' })

        const notifA = JSON.parse(wsA.send.mock.calls[1][0])
        const notifB = JSON.parse(wsB.send.mock.calls[1][0])

        expect(notifA).toStrictEqual({
          id: notifA.id,
          clientId: CLIENT_ID_A,
          type: TYPES.NOTIFICATION,
          timestamp: TIMESTAMP,
          event: 'player_joined',
          headers: {},
          body: {
            name: 'x',
          },
        })

        expect(notifB).toStrictEqual({
          id: notifB.id,
          clientId: CLIENT_ID_B,
          type: TYPES.NOTIFICATION,
          timestamp: TIMESTAMP,
          event: 'player_joined',
          headers: {},
          body: {
            name: 'x',
          },
        })
      })
    })
  })
})
