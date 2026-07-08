import * as uuid from 'uuid'
import { describe, test, expect, mock } from 'bun:test'
import { buildSocketRoutes, createSocketHandler } from './socket'
import { TYPES } from './messages'

import {
  RequestError,
  NotFoundError,
  MethodNotAllowedError,
  UnprocessableContentError,
  InternalServerError,
} from './errors'

class TestError extends RequestError {
  static get status() { return 999 }

  get output() {
    return {
      custom: 1,
      message: this.message,
    }
  }

  constructor() {
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
    const ROUTES = [
      {
        method: 'GET',
        path: '/',
        handler: fnA,
        middlewareChain: [fnB],
      },
    ]

    const result = buildSocketRoutes(ROUTES)

    expect(result).toStrictEqual([
      {
        method: 'GET',
        patternSegments: [],
        middlewareChain: [fnB],
      },
    ])
  })

  test('when only top-level route provided: /users', () => {
    const ROUTES = [
      {
        method: 'GET',
        path: '/users',
        handler: fnA,
        middlewareChain: [fnB],
      },
    ]

    const result = buildSocketRoutes(ROUTES)

    expect(result).toStrictEqual([
      {
        method: 'GET',
        patternSegments: ['users'],
        middlewareChain: [fnB],
      },
    ])
  })

  test('when only top-level route provided: /users/:userId', () => {
    const ROUTES = [
      {
        method: 'GET',
        path: '/users/:userId',
        handler: fnA,
        middlewareChain: [fnB],
      },
    ]

    const result = buildSocketRoutes(ROUTES)

    expect(result).toStrictEqual([
      {
        method: 'GET',
        patternSegments: ['users', ':userId'],
        middlewareChain: [fnB],
      },
    ])
  })

  test('when multiple items are provided', () => {
    const ROUTES = [
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
    ]

    const result = buildSocketRoutes(ROUTES)

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

describe('createSocketHandler()', () => {
  describe('message()', () => {
    const ID = uuid.v4()
    const METHOD = 'GET'
    const TIMESTAMP = '2000-01-01T00:00:00.000Z'

    const HEADERS = new Headers({
      'Content-Type': 'application/json',
    })

    test('when parsing incoming message parsing fails', async () => {
      const routes = [
        {
          method: METHOD,
          patternSegments: [],
          middlewareChain: [],
        },
      ]

      const ws = { send: mock() }
      const { message } = createSocketHandler(routes)

      await message(ws, 'invalid json')

      expect(ws.send).not.toHaveBeenCalled()
    })

    test('when request validation fails', async () => {
      const routes = [
        {
          method: METHOD,
          patternSegments: [],
          middlewareChain: [],
        },
      ]

      const incomingMessage = JSON.stringify({
        id: 'invalid',
        type: TYPES.REQUEST,
        method: METHOD,
        route: '/',
        timestamp: TIMESTAMP,
        headers: {},
        query: {},
        body: null,
      })

      const ws = { send: mock() }
      const { message } = createSocketHandler(routes)

      await message(ws, incomingMessage)

      const sendParams = JSON.parse(ws.send.mock.calls[0][0])

      expect(sendParams).toStrictEqual({
        id: 'invalid',
        type: TYPES.RESPONSE,
        status: UnprocessableContentError.status,
        timestamp: TIMESTAMP,
        headers: {},
        body: [
          {
            path: 'id',
            message: 'must match format "uuid"',
          },
        ],
      })
    })

    test('when incoming message does NOT match any routes', async () => {
      const routes = [
        {
          method: METHOD,
          patternSegments: [],
          middlewareChain: [],
        },
      ]

      const incomingMessage = JSON.stringify({
        id: ID,
        type: TYPES.REQUEST,
        method: METHOD,
        route: '/users',
        timestamp: TIMESTAMP,
        headers: HEADERS,
        query: {},
        body: null,
      })

      const ws = { send: mock() }
      const { message } = createSocketHandler(routes)

      await message(ws, incomingMessage)

      const sendParams = JSON.parse(ws.send.mock.calls[0][0])

      expect(sendParams).toStrictEqual({
        id: ID,
        type: TYPES.RESPONSE,
        status: NotFoundError.status,
        timestamp: TIMESTAMP,
        headers: {},
        body: null,
      })
    })

    test('when incoming message does NOT match any methods', async () => {
      const routes = [
        {
          method: METHOD,
          patternSegments: ['users'],
          middlewareChain: [],
        },
      ]

      const incomingMessage = JSON.stringify({
        id: ID,
        type: TYPES.REQUEST,
        method: 'POST',
        route: '/users',
        timestamp: TIMESTAMP,
        headers: HEADERS,
        query: {},
        body: null,
      })

      const ws = { send: mock() }
      const { message } = createSocketHandler(routes)

      await message(ws, incomingMessage)

      const sendParams = JSON.parse(ws.send.mock.calls[0][0])

      expect(sendParams).toStrictEqual({
        id: ID,
        type: TYPES.RESPONSE,
        status: MethodNotAllowedError.status,
        timestamp: TIMESTAMP,
        headers: {},
        body: null,
      })
    })

    test('when middleware fails (generic Error)', async () => {
      const routes = [
        {
          method: METHOD,
          patternSegments: [],
          middlewareChain: [
            (_req, _res, _next) => {
              throw new Error('Bad')
            },
          ],
        },
      ]

      const incomingMessage = JSON.stringify({
        id: ID,
        type: TYPES.REQUEST,
        method: METHOD,
        route: '/',
        timestamp: TIMESTAMP,
        headers: HEADERS,
        query: {},
        body: null,
      })

      const ws = { send: mock() }
      const { message } = createSocketHandler(routes)

      await message(ws, incomingMessage)

      const sendParams = JSON.parse(ws.send.mock.calls[0][0])

      expect(sendParams).toStrictEqual({
        id: ID,
        type: TYPES.RESPONSE,
        status: InternalServerError.status,
        timestamp: TIMESTAMP,
        headers: {},
        body: 'Bad',
      })
    })

    test('when middleware fails (RequestError subclass)', async () => {
      const routes = [
        {
          method: METHOD,
          patternSegments: [],
          middlewareChain: [
            (_req, _res, _next) => {
              throw new TestError()
            },
          ],
        },
      ]

      const incomingMessage = JSON.stringify({
        id: ID,
        type: TYPES.REQUEST,
        method: METHOD,
        route: '/',
        timestamp: TIMESTAMP,
        headers: HEADERS,
        query: {},
        body: null,
      })

      const ws = { send: mock() }
      const { message } = createSocketHandler(routes)

      await message(ws, incomingMessage)

      const sendParams = JSON.parse(ws.send.mock.calls[0][0])

      expect(sendParams).toStrictEqual({
        id: ID,
        type: TYPES.RESPONSE,
        status: TestError.status,
        timestamp: TIMESTAMP,
        headers: {},
        body: {
          custom: 1,
          message: 'This is a test',
        },
      })
    })

    test('when succeeds', async () => {
      const routes = [
        {
          method: METHOD,
          patternSegments: ['users'],
          middlewareChain: [
            (_req, _res, _next) => new Response('Success'),
          ],
        },
      ]

      const incomingMessage = JSON.stringify({
        id: ID,
        type: TYPES.REQUEST,
        method: METHOD,
        route: '/users',
        timestamp: TIMESTAMP,
        headers: HEADERS,
        query: {},
        body: null,
      })

      const ws = { send: mock() }
      const { message } = createSocketHandler(routes)

      await message(ws, incomingMessage)

      const sendParams = JSON.parse(ws.send.mock.calls[0][0])

      expect(sendParams).toStrictEqual({
        id: ID,
        type: TYPES.RESPONSE,
        status: 200,
        timestamp: TIMESTAMP,
        headers: {},
        body: 'Success',
      })
    })

    test('when route and method match with dynamic params', async () => {
      const routes = [
        {
          method: METHOD,
          patternSegments: ['users', ':userId'],
          middlewareChain: [
            (req, _res, _next) => Response.json(req.params),
          ],
        },
      ]

      const incomingMessage = JSON.stringify({
        id: ID,
        type: TYPES.REQUEST,
        method: METHOD,
        route: '/users/123',
        timestamp: TIMESTAMP,
        headers: HEADERS,
        query: {},
        body: null,
      })

      const ws = { send: mock() }
      const { message } = createSocketHandler(routes)

      await message(ws, incomingMessage)

      const sendParams = JSON.parse(ws.send.mock.calls[0][0])

      expect(sendParams).toStrictEqual({
        id: ID,
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
