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
  buildSocketState,
  buildSocketServer,
  buildSocketHandlers,
  buildSocketCommands,
} from './socket'

import {
  RequestError,
  NotFoundError,
  UnauthorizedError,
  MethodNotAllowedError,
  UnprocessableContentError,
  InternalServerError,
  ServiceUnavailableError,
} from './errors'

const ID = crypto.randomUUID()
const CLIENT_ID = crypto.randomUUID()
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
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
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

beforeEach(() => {
  spyOn(crypto, 'randomBytes').mockImplementation(b => BYTES[b])
  spyOn(crypto, 'randomUUID')

  UUIDs.forEach((_, index) => {
    crypto.randomUUID.mockReturnValueOnce(UUIDs[index])
  })
})

afterEach(() => {
  mock.restore()
})

describe('buildSocketState()', () => {
  test('when NO opts are provided', () => {
    const result = buildSocketState()

    expect(result).toStrictEqual({
      disconnectThreshold: 120000,
      heartbeatInterval: 30000,
      maxTickets: 100000,
      reclaimTtl: 300000,
      ticketTtl: 10000,
      tickets: new Map(),
      activeSessions: new Map(),
      inactiveSessions: new Map(),
    })
  })

  test('when base opts are provided', () => {
    const result = buildSocketState({})

    expect(result).toStrictEqual({
      disconnectThreshold: 120000,
      heartbeatInterval: 30000,
      maxTickets: 100000,
      reclaimTtl: 300000,
      ticketTtl: 10000,
      tickets: new Map(),
      activeSessions: new Map(),
      inactiveSessions: new Map(),
    })
  })

  test('when "opts.ws" is provided', () => {
    const result = buildSocketState({
      ws: {},
    })

    expect(result).toStrictEqual({
      disconnectThreshold: 120000,
      heartbeatInterval: 30000,
      maxTickets: 100000,
      reclaimTtl: 300000,
      ticketTtl: 10000,
      tickets: new Map(),
      activeSessions: new Map(),
      inactiveSessions: new Map(),
    })
  })

  test('when "opts.ws.disconnectThreshold" is provided', () => {
    const result = buildSocketState({
      ws: {
        heartbeatInterval: 100,
      },
    })

    expect(result).toStrictEqual({
      disconnectThreshold: 120000,
      heartbeatInterval: 100,
      maxTickets: 100000,
      reclaimTtl: 300000,
      ticketTtl: 10000,
      tickets: new Map(),
      activeSessions: new Map(),
      inactiveSessions: new Map(),
    })
  })

  test('when "opts.ws.heartbeatInterval" is provided', () => {
    const result = buildSocketState({
      ws: {
        disconnectThreshold: 100,
      },
    })

    expect(result).toStrictEqual({
      disconnectThreshold: 100,
      heartbeatInterval: 30000,
      maxTickets: 100000,
      reclaimTtl: 300000,
      ticketTtl: 10000,
      tickets: new Map(),
      activeSessions: new Map(),
      inactiveSessions: new Map(),
    })
  })

  test('when "opts.ws.maxTickets" is provided', () => {
    const result = buildSocketState({
      ws: {
        maxTickets: 5,
      },
    })

    expect(result).toStrictEqual({
      disconnectThreshold: 120000,
      heartbeatInterval: 30000,
      maxTickets: 5,
      reclaimTtl: 300000,
      ticketTtl: 10000,
      tickets: new Map(),
      activeSessions: new Map(),
      inactiveSessions: new Map(),
    })
  })

  test('when "opts.ws.reclaimTtl" is provided', () => {
    const result = buildSocketState({
      ws: {
        reclaimTtl: 100,
      },
    })

    expect(result).toStrictEqual({
      disconnectThreshold: 120000,
      heartbeatInterval: 30000,
      maxTickets: 100000,
      reclaimTtl: 100,
      ticketTtl: 10000,
      tickets: new Map(),
      activeSessions: new Map(),
      inactiveSessions: new Map(),
    })
  })

  test('when "opts.ws.ticketTtl" is provided', () => {
    const result = buildSocketState({
      ws: {
        ticketTtl: 100,
      },
    })

    expect(result).toStrictEqual({
      disconnectThreshold: 120000,
      heartbeatInterval: 30000,
      maxTickets: 100000,
      reclaimTtl: 300000,
      ticketTtl: 100,
      tickets: new Map(),
      activeSessions: new Map(),
      inactiveSessions: new Map(),
    })
  })
})

describe('buildSocketServer()', () => {
  const state = buildSocketState({
    ws: {
      disconnectThreshold: 60_000,
      heartbeatInterval: 20_000,
    },
  })

  const server = buildSocketServer([], state)

  describe('message()', () => {
    const HEADERS = new Headers({
      'content-type': 'application/json;charset=utf-8',
    })

    test('when parsing incoming message fails', async () => {
      const server = buildSocketServer([], state)
      const ws = buildSocket(CLIENT_ID)

      await server.message(ws, 'invalid json')

      expect(ws.send).not.toHaveBeenCalled()
    })

    describe(`"type" = "${TYPES.HEARTBEAT}"`, () => {
      test('when a heartbeat message is received', async () => {
        const server = buildSocketServer([], state)
        const ws = buildSocket(CLIENT_ID)

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
        const server = buildSocketServer([], state)

        const ws = buildSocket(CLIENT_ID)

        const incomingMessage = JSON.stringify({
          id: 'invalid',
          clientId: CLIENT_ID,
          type: TYPES.REQUEST,
          method: 'GET',
          route: '/',
          timestamp: TIMESTAMP,
          headers: {},
          query: {},
          body: null,
        })

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
        const server = buildSocketServer([
          {
            method: 'GET',
            path: '/',
            chain: [() => new Response('Done')],
            segments: [],
          },
        ], state)

        const ws = buildSocket(CLIENT_ID)

        const incomingMessage = JSON.stringify({
          id: ID,
          clientId: CLIENT_ID,
          type: TYPES.REQUEST,
          method: 'GET',
          route: '/users',
          timestamp: TIMESTAMP,
          headers: HEADERS,
          query: {},
          body: null,
        })

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
        const server = buildSocketServer([
          {
            method: 'GET',
            path: '/users',
            chain: [() => new Response('Done')],
            segments: ['users'],
          },
        ], state)

        const ws = buildSocket(CLIENT_ID)

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
        const server = buildSocketServer([
          {
            method: 'GET',
            path: '/',
            chain: [
              () => {
                throw new Error('Bad')
              },
            ],
            segments: [],
          },
        ], state)

        const ws = buildSocket(CLIENT_ID)

        const incomingMessage = JSON.stringify({
          id: ID,
          clientId: CLIENT_ID,
          type: TYPES.REQUEST,
          method: 'GET',
          route: '/',
          timestamp: TIMESTAMP,
          headers: HEADERS,
          query: {},
          body: null,
        })

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
        const server = buildSocketServer([
          {
            method: 'GET',
            path: '/',
            chain: [
              () => {
                throw new TestError()
              },
            ],
            segments: [],
          },
        ], state)

        const ws = buildSocket(CLIENT_ID)

        const incomingMessage = JSON.stringify({
          id: ID,
          clientId: CLIENT_ID,
          type: TYPES.REQUEST,
          method: 'GET',
          route: '/',
          timestamp: TIMESTAMP,
          headers: HEADERS,
          query: {},
          body: null,
        })

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
        const server = buildSocketServer([
          {
            method: 'GET',
            path: '/users',
            chain: [() => new Response('Success')],
            segments: ['users'],
          },
        ], state)

        const ws = buildSocket(CLIENT_ID)

        const incomingMessage = JSON.stringify({
          id: ID,
          clientId: CLIENT_ID,
          type: TYPES.REQUEST,
          method: 'GET',
          route: '/users',
          timestamp: TIMESTAMP,
          headers: HEADERS,
          query: {},
          body: null,
        })

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
        const server = buildSocketServer([
          {
            method: 'GET',
            path: '/users/:userId',
            chain: [req => Response.json(req.params)],
            segments: ['users', ':userId'],
          },
        ], state)

        const ws = buildSocket(CLIENT_ID)

        const incomingMessage = JSON.stringify({
          id: ID,
          clientId: CLIENT_ID,
          type: TYPES.REQUEST,
          method: 'GET',
          route: '/users/123',
          timestamp: TIMESTAMP,
          headers: HEADERS,
          query: {},
          body: null,
        })

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
      const ws = buildSocket(CLIENT_ID)

      server.open(ws)

      expect(ws.welcome).toStrictEqual({
        id: ws.welcome.id,
        clientId: CLIENT_ID,
        type: TYPES.WELCOME,
        timestamp: TIMESTAMP,
        headers: {},
        body: {
          heartbeatInterval: 20_000,
          token: BASE64_32,
        },
      })
    })

    test('when an existing socket for the client is registered', () => {
      const oldWs = buildSocket(CLIENT_ID)
      const newWs = buildSocket(CLIENT_ID)

      server.open(oldWs)
      server.open(newWs)

      expect(oldWs.data.superseded).toBe(true)
      expect(oldWs.close).toHaveBeenCalledOnce()
    })

    test('when the disconnect heartbeat threshold elapses', () => {
      const ws = buildSocket(CLIENT_ID)

      server.open(ws)
      jest.advanceTimersByTime(state.disconnectThreshold + 1)

      expect(ws.close).toHaveBeenCalledOnce()
      expect(ws.data.reaped).toBe(true)
    })

    test('when a heartbeat arrives before the threshold', async () => {
      const ws = buildSocket(CLIENT_ID)

      server.open(ws)
      jest.advanceTimersByTime(state.disconnectThreshold - 100)

      await server.message(ws, JSON.stringify({
        type: TYPES.HEARTBEAT,
      }))

      jest.advanceTimersByTime(state.disconnectThreshold - 100)

      expect(ws.close).not.toHaveBeenCalled()

      jest.advanceTimersByTime(state.disconnectThreshold - 100)

      expect(ws.close).toHaveBeenCalledOnce()
    })

    test('when a heartbeat resets the disconnect threshold', async () => {
      const ws = buildSocket(CLIENT_ID)

      server.open(ws)
      jest.advanceTimersByTime(state.disconnectThreshold - 100)

      expect(ws.close).not.toHaveBeenCalled()

      await server.message(ws, JSON.stringify({
        type: TYPES.HEARTBEAT,
      }))

      jest.advanceTimersByTime(state.disconnectThreshold - 100)

      expect(ws.close).not.toHaveBeenCalled()

      jest.advanceTimersByTime(state.disconnectThreshold + 100)

      expect(ws.close).toHaveBeenCalledOnce()
    })

    test('when an expired inactive session is present', () => {
      const state = buildSocketState()
      const server = buildSocketServer([], state)
      const ws = buildSocket(CLIENT_ID)

      state.inactiveSessions.set('stale', {
        token: 'a',
        expiresAt: Date.now() - 1,
      })

      state.inactiveSessions.set('fresh', {
        token: 'b',
        expiresAt: Date.now() + 10_000,
      })

      server.open(ws)

      expect(state.inactiveSessions.has('stale')).toBe(false)
      expect(state.inactiveSessions.has('fresh')).toBe(true)
    })
  })

  describe('close()', () => {
    const handlers = buildSocketHandlers(state)
    const updateTicket = handlers[2].handler

    test('when the socket is no longer registered', () => {
      const state = buildSocketState()
      const server = buildSocketServer([], state)
      const ws = buildSocket(CLIENT_ID)

      server.open(ws)
      server.close(ws, 1000)

      const fn = () => server.close(ws, 1006)

      expect(fn).not.toThrow()
      expect(state.inactiveSessions.has(CLIENT_ID)).toBe(false)
    })

    test('when the socket was superseded', async () => {
      const oldSocket = buildSocket(CLIENT_ID)
      const newSocket = buildSocket(CLIENT_ID)

      server.open(oldSocket)
      server.close(oldSocket, 1000)
      server.open(newSocket)

      const res = updateTicket({
        method: 'PUT',
        headers: new Headers({
          authorization: `Bearer ${newSocket.welcome.body.token}`,
        }),
        params: {
          clientId: CLIENT_ID,
        },
      }, {})

      const result = await res.json()

      expect(result).toStrictEqual({
        clientId: CLIENT_ID,
        ticket: BASE64_24,
        data: {},
      })
    })

    test('when an involuntary close occurs', async () => {
      const ws = buildSocket(CLIENT_ID)

      server.open(ws)

      const res = updateTicket({
        method: 'PUT',
        headers: new Headers({
          authorization: `Bearer ${BASE64_32}`,
        }),
        params: {
          clientId: CLIENT_ID,
        },
      }, {})

      const result = await res.json()

      server.close(ws, 1006)

      expect(result).toStrictEqual({
        clientId: CLIENT_ID,
        ticket: BASE64_24,
        data: {},
      })
    })

    test('when the reaper fired before an otherwise-clean close', async () => {
      const ws = buildSocket(CLIENT_ID)

      server.open(ws)
      jest.advanceTimersByTime(state.disconnectThreshold + 100)
      server.close(ws, 1000)

      const res = updateTicket({
        method: 'PUT',
        headers: new Headers({
          authorization: `Bearer ${BASE64_32}`,
        }),
        params: {
          clientId: CLIENT_ID,
        },
      }, {})

      const result = await res.json()

      expect(result).toStrictEqual({
        clientId: CLIENT_ID,
        ticket: BASE64_24,
        data: {},
      })
    })

    test('when the reclaim window has expired', () => {
      const ws = buildSocket(CLIENT_ID)

      server.open(ws)

      const fn = () => updateTicket({
        method: 'PUT',
        headers: new Headers({
          authorization: `Bearer ${BASE64_32}`,
        }),
        params: {
          clientId: CLIENT_ID,
        },
      })

      server.close(ws, 1006)
      jest.advanceTimersByTime(101)

      expect(fn).toThrow(new NotFoundError())
    })

    test('when a willing close occurs', () => {
      const ws = buildSocket(CLIENT_ID)

      server.open(ws)

      const fn = () => updateTicket({
        method: 'PUT',
        headers: new Headers({
          authorization: `Bearer ${BASE64_32}`,
        }),
        params: {
          clientId: CLIENT_ID,
        },
      })

      server.close(ws, 1000)

      expect(fn).toThrow(new NotFoundError())
    })
  })
})

describe('buildSocketHandlers()', () => {
  const REQ_RAW = {}
  const RES_HANDLER = { ok: true }

  const state = buildSocketState()
  const handlers = buildSocketHandlers(state)
  const createSocket = handlers[0].handler
  const createTicket = handlers[1].handler
  const updateTicket = handlers[2].handler

  describe('GET', () => {
    test('when invoked via WebSocket message', async () => {
      const upgrade = mock(() => true)
      const ticketRes = createTicket({}, {})
      const ticketBody = await ticketRes.json()

      const fn = () => createSocket({
        clientId: crypto.randomUUID(),
        query: {
          ticket: ticketBody.ticket,
        },
        server: {
          upgrade,
        },
        raw: REQ_RAW,
      })

      expect(fn).toThrow(new UnprocessableContentError([
        {
          path: '',
          message: 'must NOT be valid',
        },
      ]))
    })

    test('when "req.query" is missing', () => {
      const upgrade = mock(() => true)

      const fn = () => createSocket({
        server: {
          upgrade,
        },
        raw: REQ_RAW,
      }, {})

      expect(fn).toThrow(new UnprocessableContentError([
        {
          path: '',
          message: `must have required property 'query'`,
        },
      ]))
    })

    test('when "req.query.ticket" is missing', () => {
      const upgrade = mock(() => true)

      const fn = () => createSocket({
        query: {},
        server: {
          upgrade,
        },
        raw: REQ_RAW,
      }, {})

      expect(fn).toThrow(new UnprocessableContentError([
        {
          path: 'query',
          message: `must have required property 'ticket'`,
        },
      ]))
    })

    test('when "req.server" is missing', async () => {
      const ticketRes = createTicket({}, {})
      const ticketBody = await ticketRes.json()

      const fn = () => createSocket({
        query: {
          ticket: ticketBody.ticket,
        },
        raw: REQ_RAW,
      }, {})

      expect(fn).toThrow(new UnprocessableContentError([
        {
          path: '',
          message: `must have required property 'server'`,
        },
      ]))
    })

    test('when "req.server.upgrade" is missing', async () => {
      const ticketRes = createTicket({}, {})
      const ticketBody = await ticketRes.json()

      const fn = () => createSocket({
        query: {
          ticket: ticketBody.ticket,
        },
        server: {},
        raw: REQ_RAW,
      }, {})

      expect(fn).toThrow(new UnprocessableContentError([
        {
          path: 'server',
          message: `must have required property 'upgrade'`,
        },
      ]))
    })

    test('when "req.raw" is missing', async () => {
      const upgrade = mock(() => true)
      const ticketRes = createTicket({}, {})
      const ticketBody = await ticketRes.json()

      const fn = () => createSocket({
        query: {
          ticket: ticketBody.ticket,
        },
        server: {
          upgrade,
        },
      }, {})

      expect(fn).toThrow(new UnprocessableContentError([
        {
          path: '',
          message: `must have required property 'raw'`,
        },
      ]))
    })

    test('when the provided ticket does not exist', () => {
      const upgrade = mock(() => true)

      const fn = () => createSocket({
        query: {
          ticket: 'nope',
        },
        server: {
          upgrade,
        },
        raw: {
          type: 'object',
        },
      }, {})

      expect(fn).toThrow(new NotFoundError())
    })

    test('when the same ticket is redeemed twice', async () => {
      const upgrade = mock(() => true)
      const ticketRes = createTicket({}, {})
      const ticketBody = await ticketRes.json()

      const fn = () => createSocket({
        query: {
          ticket: ticketBody.ticket,
        },
        server: {
          upgrade,
        },
        raw: REQ_RAW,
      }, {})

      fn() /* call first time */

      expect(fn).toThrow(new NotFoundError())

      expect(upgrade).toHaveBeenCalledWith(REQ_RAW, {
        data: {
          clientId: UUIDs[0],
        },
      })
    })

    test('when the ticket has expired', async () => {
      const ticketRes = createTicket({}, {})
      const ticketBody = await ticketRes.json()

      const fn = () => createSocket({
        query: {
          ticket: ticketBody.ticket,
        },
        server: {
          upgrade: () => true,
        },
        raw: REQ_RAW,
      }, {})

      jest.advanceTimersByTime(10_001)

      expect(fn).toThrow(new NotFoundError())
    })

    test('when the upgrade is refused', async () => {
      const upgrade = mock(() => false)
      const ticketRes = createTicket({}, {})
      const ticketBody = await ticketRes.json()

      const fn = () => createSocket({
        query: {
          ticket: ticketBody.ticket,
        },
        server: {
          upgrade,
        },
        raw: REQ_RAW,
      }, {})

      expect(fn).toThrow(new NotFoundError())

      expect(upgrade).toHaveBeenCalledWith(REQ_RAW, {
        data: {
          clientId: UUIDs[0],
        },
      })
    })

    test('when the ticket is valid', async () => {
      const upgrade = mock(() => true)
      const ticketRes = createTicket({}, {})
      const ticketBody = await ticketRes.json()

      const res = createSocket({
        query: {
          ticket: ticketBody.ticket,
        },
        server: {
          upgrade,
        },
        raw: REQ_RAW,
      }, {})


      expect(upgrade).toHaveBeenCalledWith(REQ_RAW, {
        data: {
          clientId: UUIDs[0],
        },
      })

      expect(res.status).toBe(200)
    })

    test('when "res" is not of type "object"', async () => {
      const upgrade = mock(() => true)
      const ticketRes = createTicket({}, {})
      const ticketBody = await ticketRes.json()

      const fn = () => createSocket({
        query: {
          ticket: ticketBody.ticket,
        },
        server: {
          upgrade,
        },
        raw: REQ_RAW,
      }, 'asdf')

      expect(fn).toThrow(new TypeError('Endpoint "res" must be an object'))
      expect(upgrade).not.toHaveBeenCalledWith()
    })

    test('when "res" is NULL', async () => {
      const upgrade = mock(() => true)
      const ticketRes = createTicket({}, {})
      const ticketBody = await ticketRes.json()

      const res = createSocket({
        query: {
          ticket: ticketBody.ticket,
        },
        server: {
          upgrade,
        },
        raw: REQ_RAW,
      }, null)

      expect(res.status).toBe(200)

      expect(upgrade).toHaveBeenCalledWith(REQ_RAW, {
        data: {
          clientId: UUIDs[0],
        },
      })
    })

    test('when "res" is an empty object', async () => {
      const upgrade = mock(() => true)
      const ticketRes = createTicket({}, {})
      const ticketBody = await ticketRes.json()

      const res = createSocket({
        query: {
          ticket: ticketBody.ticket,
        },
        server: {
          upgrade,
        },
        raw: REQ_RAW,
      }, {})

      expect(res.status).toBe(200)

      expect(upgrade).toHaveBeenCalledWith(REQ_RAW, {
        data: {
          clientId: UUIDs[0],
        },
      })
    })

    test('when "res.data" is an empty object', async () => {
      const upgrade = mock(() => true)
      const ticketRes = createTicket({}, {})
      const ticketBody = await ticketRes.json()

      const middlewareRes = {
        data: {},
      }

      const res = createSocket({
        query: {
          ticket: ticketBody.ticket,
        },
        server: {
          upgrade,
        },
        raw: REQ_RAW,
      }, middlewareRes)

      expect(res.status).toBe(200)

      expect(upgrade).toHaveBeenCalledWith(REQ_RAW, {
        data: {
          clientId: UUIDs[0],
        },
      })
    })

    test('when "res.data" is an object with content', async () => {
      const upgrade = mock(() => true)
      const ticketRes = createTicket({}, {})
      const ticketBody = await ticketRes.json()

      const middlewareRes = {
        data: {
          ok: true,
        },
      }

      const res = createSocket({
        query: {
          ticket: ticketBody.ticket,
        },
        server: {
          upgrade,
        },
        raw: REQ_RAW,
      }, middlewareRes)

      expect(upgrade).toHaveBeenCalledWith(REQ_RAW, {
        data: {
          clientId: UUIDs[0],
          ok: true,
        },
      })

      expect(res.status).toBe(200)
    })

    test('when "res" has other top-level properties', async () => {
      const upgrade = mock(() => true)
      const ticketRes = createTicket({}, {})
      const ticketBody = await ticketRes.json()

      const middlewareRes = {
        headers: new Headers({
          authorization: 'Bearer abc',
        }),
      }

      const res = createSocket({
        query: {
          ticket: ticketBody.ticket,
        },
        server: {
          upgrade,
        },
        raw: REQ_RAW,
      }, middlewareRes)

      expect(upgrade).toHaveBeenCalledWith(REQ_RAW, {
        ...middlewareRes,
        data: {
          clientId: UUIDs[0],
        },
      })

      expect(res.status).toBe(200)
    })
  })

  describe('POST', () => {
    test('when invoked via WebSocket message', () => {
      const fn = () => createTicket({
        clientId: crypto.randomUUID(),
      }, {})

      expect(fn).toThrow(new UnprocessableContentError([
        {
          path: '',
          message: 'must NOT be valid',
        },
      ]))
    })

    test('when the ticket cap is reached', () => {
      const state = buildSocketState({
        ws: {
          maxTickets: 2,
        },
      })

      const handlers = buildSocketHandlers(state)
      const createTicket = handlers[1].handler

      state.tickets.set('a', {
        clientId: 'x',
        expiresAt: Date.now() + 10_000,
      })

      state.tickets.set('b', {
        clientId: 'y',
        expiresAt: Date.now() + 10_000,
      })

      const fn = () => createTicket({}, {})

      expect(fn).toThrow(new ServiceUnavailableError())
    })

    test('when called, it mints a fresh clientId and ticket', async () => {
      const res = createTicket({}, {})
      const result = await res.json()

      expect(res.status).toBe(201)

      expect(result).toStrictEqual({
        clientId: UUIDs[0],
        ticket: BASE64_24,
        data: {},
      })
    })

    test('when expired tickets exist, it sweeps them on mint', () => {
      const state = buildSocketState()
      const handlers = buildSocketHandlers(state)
      const createTicket = handlers[1].handler

      state.tickets.set('expired-a', {
        clientId: 'x',
        expiresAt: Date.now() - 100,
      })

      state.tickets.set('expired-b', {
        clientId: 'y',
        expiresAt: Date.now() - 100,
      })

      const res = createTicket({}, {})

      expect(res.status).toBe(201)
      expect(state.tickets.size).toBe(1)
    })

    test('when "res" has content', async () => {
      const res = createTicket({}, RES_HANDLER)
      const result = await res.json()

      expect(res.status).toBe(201)

      expect(result).toStrictEqual({
        clientId: UUIDs[0],
        ticket: BASE64_24,
        data: RES_HANDLER,
      })
    })
  })

  describe('PUT', () => {
    test('when invoked via WebSocket message', () => {
      const fn = () => updateTicket({
        clientId: crypto.randomUUID(),
        params: {
          clientId: crypto.randomUUID(),
        },
        headers: new Headers({
          authorization: 'Bearer abc',
        }),
      }, {})

      expect(fn).toThrow(new UnprocessableContentError([
        {
          path: '',
          message: 'must NOT be valid',
        },
      ]))
    })

    test('when "params" is missing', () => {
      const fn = () => updateTicket({
        headers: new Headers({
          authorization: 'Bearer abc',
        }),
      }, {})

      expect(fn).toThrow(new UnprocessableContentError([
        {
          path: '',
          message: `must have required property 'params'`,
        },
      ]))
    })

    test('when "params.clientId" is missing', () => {
      const fn = () => updateTicket({
        params: {},
        headers: new Headers({
          authorization: 'Bearer abc',
        }),
      }, {})

      expect(fn).toThrow(new UnprocessableContentError([
        {
          path: 'params',
          message: `must have required property 'clientId'`,
        },
      ]))
    })

    test('when "headers.authorization" is missing', () => {
      const fn = () => updateTicket({
        params: {
          clientId: UUIDs[0],
        },
        headers: new Headers({}),
      }, {})

      expect(fn).toThrow(new UnprocessableContentError([
        {
          path: 'headers',
          message: `must have required property 'authorization'`,
        },
      ]))
    })

    test('when "headers.authorization" missing "Bearer "', () => {
      const fn = () => updateTicket({
        params: {
          clientId: UUIDs[0],
        },
        headers: new Headers({
          authorization: 'abc',
        }),
      }, {})

      expect(fn).toThrow(new UnprocessableContentError([
        {
          path: 'headers.authorization',
          message: `must match pattern "^Bearer .+$"`,
        },
      ]))
    })

    test('when the clientId has no session', () => {
      const fn = () => updateTicket({
        params: {
          clientId: 'does-not-exist',
        },
        headers: new Headers({
          authorization: 'Bearer abc',
        }),
      }, {})

      expect(fn).toThrow(new NotFoundError())
    })

    test('when the token is incorrect', () => {
      const server = buildSocketServer([], state)
      const ws = buildSocket(CLIENT_ID)

      server.open(ws)

      const fn = () => updateTicket({
        params: {
          clientId: CLIENT_ID,
        },
        headers: new Headers({
          authorization: `Bearer abc`,
        }),
      }, {})

      expect(fn).toThrow(new UnauthorizedError())
    })

    test('when the socket is closed unexpectedly (expired)', () => {
      const server = buildSocketServer([], state)
      const ws = buildSocket(CLIENT_ID)

      server.open(ws)
      server.close(ws, 1006)
      jest.advanceTimersByTime(state.reclaimTtl + 1)

      const fn = () => updateTicket({
        params: {
          clientId: CLIENT_ID,
        },
        headers: new Headers({
          authorization: `Bearer ${BASE64_32}`,
        }),
      }, {})

      expect(fn).toThrow(new NotFoundError())
    })

    test('when the socket is closed unexpectedly and (fresh)', async () => {
      const server = buildSocketServer([], state)
      const ws = buildSocket(CLIENT_ID)

      server.open(ws)
      server.close(ws, 1006)

      const result = updateTicket({
        params: {
          clientId: CLIENT_ID,
        },
        headers: new Headers({
          authorization: `Bearer ${BASE64_32}`,
        }),
      }, {})

      const body = await result.json()

      expect(result.status).toBe(200)

      expect(body).toStrictEqual({
        clientId: CLIENT_ID,
        ticket: BASE64_24,
        data: {},
      })
    })

    test('when the socket is still open', async () => {
      const server = buildSocketServer([], state)
      const ws = buildSocket(CLIENT_ID)

      server.open(ws)

      const res = updateTicket({
        params: {
          clientId: CLIENT_ID,
        },
        headers: new Headers({
          authorization: `Bearer ${BASE64_32}`,
        }),
      }, {})

      const body = await res.json()

      expect(res.status).toBe(200)

      expect(body).toStrictEqual({
        clientId: CLIENT_ID,
        ticket: BASE64_24,
        data: {},
      })
    })

    test('when "res" has content', async () => {
      const server = buildSocketServer([], state)
      const ws = buildSocket(CLIENT_ID)

      server.open(ws)
      server.close(ws, 1006)

      const result = updateTicket({
        params: {
          clientId: CLIENT_ID,
        },
        headers: new Headers({
          authorization: `Bearer ${BASE64_32}`,
        }),
      }, RES_HANDLER)

      const body = await result.json()

      expect(result.status).toBe(200)

      expect(body).toStrictEqual({
        clientId: CLIENT_ID,
        ticket: BASE64_24,
        data: RES_HANDLER,
      })
    })
  })
})

describe('buildSocketCommands()', () => {
  const state = buildSocketState()
  const server = buildSocketServer([], state)
  const commands = buildSocketCommands(state)

  describe('send()', () => {
    test('when the client has no live socket', () => {
      const fn = () => commands.send(CLIENT_ID, 'state_changed', {
        ok: true,
      })

      expect(fn).toThrow(
        new ReferenceError(`No live socket for client: ${CLIENT_ID}`),
      )
    })

    test('when the client has a live socket', () => {
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
