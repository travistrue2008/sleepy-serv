import { describe, test, expect, mock } from 'bun:test'

import {
  HttpMethod,
  StatusCode,
  toSegments,
  formatError,
  executeMiddlewareChain,
} from './utils'

import type { Request } from './utils'

describe('StatusCode', () => {
  test('when every member is compared against its literal code', () => {
    expect(StatusCode).toStrictEqual({
      Continue: 100,
      SwitchingProtocols: 101,
      Processing: 102,
      EarlyHints: 103,
      Ok: 200,
      Created: 201,
      Accepted: 202,
      NonAuthoritativeInformation: 203,
      NoContent: 204,
      ResetContent: 205,
      PartialContent: 206,
      MultiStatus: 207,
      AlreadyReported: 208,
      ImUsed: 226,
      MultipleChoices: 300,
      MovedPermanently: 301,
      Found: 302,
      SeeOther: 303,
      NotModified: 304,
      UseProxy: 305,
      TemporaryRedirect: 307,
      PermanentRedirect: 308,
      BadRequest: 400,
      Unauthorized: 401,
      PaymentRequired: 402,
      Forbidden: 403,
      NotFound: 404,
      MethodNotAllowed: 405,
      NotAcceptable: 406,
      ProxyAuthenticationRequired: 407,
      RequestTimeout: 408,
      Conflict: 409,
      Gone: 410,
      LengthRequired: 411,
      PreconditionFailed: 412,
      PayloadTooLarge: 413,
      UriTooLong: 414,
      UnsupportedMediaType: 415,
      RangeNotSatisfiable: 416,
      ExpectationFailed: 417,
      ImATeapot: 418,
      MisdirectedRequest: 421,
      UnprocessableContent: 422,
      Locked: 423,
      FailedDependency: 424,
      TooEarly: 425,
      UpgradeRequired: 426,
      PreconditionRequired: 428,
      TooManyRequests: 429,
      RequestHeaderFieldsTooLarge: 431,
      UnavailableForLegalReasons: 451,
      InternalServerError: 500,
      NotImplemented: 501,
      BadGateway: 502,
      ServiceUnavailable: 503,
      GatewayTimeout: 504,
      HTTPVersionNotSupported: 505,
      VariantAlsoNegotiates: 506,
      InsufficientStorage: 507,
      LoopDetected: 508,
      NotExtended: 510,
      NetworkAuthenticationRequired: 511,
    })
  })

  test('when every code is checked for uniqueness', () => {
    const codes = Object.values(StatusCode)
    const unique = new Set(codes)

    expect(unique.size).toBe(codes.length)
  })
})

describe('toSegments()', () => {
  test('when no slashes on either end', () => {
    const result = toSegments('a/b')

    expect(result).toStrictEqual(['a', 'b'])
  })

  test('when a leading slash is provided', () => {
    const result = toSegments('/a/b')

    expect(result).toStrictEqual(['a', 'b'])
  })

  test('when a trailing slash is provided', () => {
    const result = toSegments('a/b/')

    expect(result).toStrictEqual(['a', 'b'])
  })

  test('when an empty segment is provided', () => {
    const result = toSegments('a//b')

    expect(result).toStrictEqual(['a', '', 'b'])
  })
})

describe('formatError()', () => {
  test('when instancePath is empty (root) with a prefix', () => {
    const result = formatError('body', {
      instancePath: '',
      message: `must have required property 'firstName'`,
    })

    expect(result).toStrictEqual({
      path: 'body',
      message: `must have required property 'firstName'`,
    })
  })

  test('when instancePath is empty (root) with no prefix', () => {
    const result = formatError('', {
      instancePath: '',
      message: 'must be object',
    })

    expect(result).toStrictEqual({
      path: '',
      message: 'must be object',
    })
  })

  test('when instancePath is a single segment with a prefix', () => {
    const result = formatError('headers', {
      instancePath: '/userId',
      message: 'must match format "uuid"',
    })

    expect(result).toStrictEqual({
      path: 'headers.userId',
      message: 'must match format "uuid"',
    })
  })

  test('when instancePath is a single segment with no prefix', () => {
    const result = formatError('', {
      instancePath: '/userId',
      message: 'must match format "uuid"',
    })

    expect(result).toStrictEqual({
      path: 'userId',
      message: 'must match format "uuid"',
    })
  })

  test('when instancePath is nested', () => {
    const result = formatError('body', {
      instancePath: '/stats/strength',
      message: 'must be number',
    })

    expect(result).toStrictEqual({
      path: 'body.stats.strength',
      message: 'must be number',
    })
  })

  test('when instancePath is deeply nested (all separators preserved)', () => {
    const result = formatError('body', {
      instancePath: '/a/b/c',
      message: 'must be string',
    })

    expect(result).toStrictEqual({
      path: 'body.a.b.c',
      message: 'must be string',
    })
  })

  test('when instancePath is missing (treated as root)', () => {
    const result = formatError('body', {
      message: `must have required property 'id'`,
    })

    expect(result).toStrictEqual({
      path: 'body',
      message: `must have required property 'id'`,
    })
  })

  test('when instancePath is undefined (treated as root)', () => {
    const result = formatError('params', {
      instancePath: undefined,
      message: 'must be object',
    })

    expect(result).toStrictEqual({
      path: 'params',
      message: 'must be object',
    })
  })

  test('when message is missing', () => {
    const result = formatError('body', {
      instancePath: '/id',
    })

    expect(result).toStrictEqual({
      path: 'body.id',
      message: '',
    })
  })

  test('when the input carries extra Ajv keys (ignored)', () => {
    const result = formatError('query', {
      schemaPath: '#/properties/page/type',
      instancePath: '/page',
      keyword: 'type',
      message: 'must be integer',
      params: {
        type: 'integer',
      },
    })

    expect(result).toStrictEqual({
      path: 'query.page',
      message: 'must be integer',
    })
  })
})

describe('executeMiddlewareChain()', () => {
  const REQ: Request = {
    id: '00000000-0000-0000-0000-000000000000',
    clientId: '00000000-0000-0000-0000-000000000001',
    method: HttpMethod.Get,
    route: '/users',
    headers: new Headers(),
    params: {},
    query: {},
    json: async () => null,
    ws: {
      active: new Map(),
    },
  }

  test('when NO middleware is provided', async () => {
    const fn = () => executeMiddlewareChain(REQ, [])

    expect(fn).toThrow(new RangeError('Middleware chain is empty'))
  })

  test('when a single middleware is provided', async () => {
    const middleware = mock().mockResolvedValueOnce(new Response('OK'))
    const result = await executeMiddlewareChain(REQ, [middleware])
    const output = await result.text()

    expect(output).toBe('OK')
    expect(middleware).toHaveBeenCalledOnce()
    expect(middleware).toHaveBeenCalledWith(REQ, null)
  })

  test('when multiple middleware are provided', async () => {
    const order: string[] = []

    const chain = [
      mock().mockImplementationOnce((_req, res, next) => {
        order.push('a')

        return next(res)
      }),
      mock().mockImplementationOnce((_req, _res, _next) => {
        order.push('b')

        return new Response('OK')
      }),
    ]

    const result = await executeMiddlewareChain(REQ, chain)
    const output = await result.text()

    expect(output).toBe('OK')
    expect(order).toStrictEqual(['a', 'b'])
    expect(chain[0]).toHaveBeenCalledOnce()
    expect(chain[0]).toHaveBeenCalledWith(REQ, null, expect.any(Function))
    expect(chain[1]).toHaveBeenCalledOnce()
    expect(chain[1]).toHaveBeenCalledWith(REQ, null)
  })

  test('when "next()" is NOT called', async () => {
    const chain = [
      mock().mockImplementationOnce((_req, _res, _next) => { }),
      mock().mockResolvedValueOnce(new Response('OK')),
    ]

    const fn = () => executeMiddlewareChain(REQ, chain)
    const err = new TypeError('Handler does not return a Response object')

    await expect(fn).toThrow(err)
  })

  test('when a middleware calls "next()" without returning', async () => {
    const chain = [
      mock().mockImplementationOnce((_req, _res, next) => {
        next()
      }),
      mock().mockImplementationOnce((_req, _res, _next) => {
        return new Response('OK')
      }),
    ]

    const fn = () => executeMiddlewareChain(REQ, chain)
    const err = new TypeError('Handler does not return a Response object')

    expect(fn).toThrow(err)
  })

  test('when a plain object is returned at the end', async () => {
    const chain = [
      mock().mockImplementationOnce((_req, _res, _next) => { }),
      mock().mockResolvedValueOnce({ a: 1 }),
    ]

    const fn = () => executeMiddlewareChain(REQ, chain)
    const err = new TypeError('Handler does not return a Response object')

    await expect(fn).toThrow(err)
  })

  test('when next() is called with no argument', async () => {
    const chain = [
      mock().mockImplementationOnce((_req, _res, next) => next()),
      mock().mockResolvedValueOnce(new Response('OK')),
    ]

    await executeMiddlewareChain(REQ, chain)

    expect(chain[1]).toHaveBeenCalledWith(REQ, undefined)
  })

  test('when data is passed through next()', async () => {
    const chain = [
      mock().mockImplementationOnce((_req, res, next) => next({
        ...res,
        pass1: 'abc',
      })),
      mock().mockImplementationOnce((_req, res, _next) => Response.json({
        ...res,
        pass2: 'def',
      })),
    ]

    const result = await executeMiddlewareChain(REQ, chain)
    const output = await result.json()

    expect(output).toStrictEqual({
      pass1: 'abc',
      pass2: 'def',
    })
  })

  test('when next() replaces the result value', async () => {
    const chain = [
      mock().mockImplementationOnce((_req, _res, next) => next({
        swapped: true,
      })),
      mock().mockResolvedValueOnce(new Response('OK')),
    ]

    await executeMiddlewareChain(REQ, chain)

    expect(chain[1]).toHaveBeenCalledWith(REQ, { swapped: true })
  })

  test('when a middleware returns a Response', async () => {
    const order: string[] = []

    const chain = [
      mock().mockImplementationOnce((_req, res, next) => {
        order.push('a')

        return next(res)
      }),
      mock().mockImplementationOnce((_req, _res, next) => {
        order.push('b')

        return new Response('Early')
      }),
      mock().mockImplementationOnce((_req, _res, next) => {
        order.push('c')

        return new Response('Hello world')
      }),
    ]

    const result = await executeMiddlewareChain(REQ, chain)
    const output = await result.text()

    expect(output).toBe('Early')
    expect(order).toStrictEqual(['a', 'b'])
    expect(chain[0]).toHaveBeenCalledOnce()
    expect(chain[0]).toHaveBeenCalledWith(REQ, null, expect.any(Function))
    expect(chain[1]).toHaveBeenCalledOnce()
    expect(chain[1]).toHaveBeenCalledWith(REQ, null, expect.any(Function))
    expect(chain[2]).not.toHaveBeenCalled()
  })

  test('when middleware is async', async () => {
    const chain = [
      mock().mockImplementationOnce(async (_req, res, next) => {
        await Promise.resolve()

        return next(res)
      }),
      mock().mockResolvedValueOnce(new Response('OK')),
    ]

    const result = await executeMiddlewareChain(REQ, chain)
    const output = await result.text()

    expect(output).toBe('OK')
    expect(chain[0]).toHaveBeenCalledOnce()
    expect(chain[0]).toHaveBeenCalledWith(REQ, null, expect.any(Function))
    expect(chain[1]).toHaveBeenCalledOnce()
    expect(chain[1]).toHaveBeenCalledWith(REQ, null)
  })

  test('when an error is thrown', async () => {
    const err = new Error('Test')

    const chain = [
      mock().mockImplementationOnce((_req, _res, next) => {
        throw err
      }),
      mock().mockImplementationOnce((_req, _res, _next) => {
        return new Response('OK')
      }),
    ]

    const fn = () => executeMiddlewareChain(REQ, chain)

    expect(fn).toThrow(err)
  })
})
