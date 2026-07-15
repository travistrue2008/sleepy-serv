import { describe, test, expect, mock } from 'bun:test'

import {
  toSegments,
  formatError,
  executeMiddlewareChain,
} from './utils'

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
  const REQ = { url: '/users' }

  test('when NO middleware is provided', async () => {
    const fn = () => executeMiddlewareChain({}, [])

    await expect(fn).toThrow(new RangeError('Middleware chain is empty'))
  })

  test('when a single middleware is provided', async () => {
    const middleware = mock().mockResolvedValueOnce(new Response('OK'))
    const result = await executeMiddlewareChain(REQ, [middleware])
    const output = await result.text()

    expect(output).toBe('OK')
    expect(middleware).toHaveBeenCalledOnce()
    expect(middleware).toHaveBeenCalledWith(REQ, {}, null)
  })

  test('when multiple middleware are provided', async () => {
    const order = []

    const chain = [
      mock().mockImplementationOnce((_req, _res, next) => {
        order.push('a')

        return next()
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
    expect(chain[0]).toHaveBeenCalledWith(REQ, {}, expect.any(Function))
    expect(chain[1]).toHaveBeenCalledOnce()
    expect(chain[1]).toHaveBeenCalledWith(REQ, {}, null)
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

    const fn = () => executeMiddlewareChain({}, chain)
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

  test('when the response object accumulates', async () => {
    const chain = [
      mock().mockImplementationOnce((_req, res, next) => {
        res.pass1 = 'abc'

        return next()
      }),
      mock().mockImplementationOnce((_req, res, _next) => {
        res.pass2 = 'def'

        return Response.json(res)
      }),
    ]

    const result = await executeMiddlewareChain(REQ, chain)
    const output = await result.json()

    expect(output).toStrictEqual({
      pass1: 'abc',
      pass2: 'def',
    })
  })

  test('when a middleware returns a Response', async () => {
    const order = []

    const chain = [
      mock().mockImplementationOnce((_req, _res, next) => {
        order.push('a')

        return next()
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
    expect(chain[0]).toHaveBeenCalledWith(REQ, {}, expect.any(Function))
    expect(chain[1]).toHaveBeenCalledOnce()
    expect(chain[1]).toHaveBeenCalledWith(REQ, {}, expect.any(Function))
    expect(chain[2]).not.toHaveBeenCalled()
  })

  test('when middleware is async', async () => {
    const chain = [
      mock().mockImplementationOnce(async (_req, _res, next) => {
        await Promise.resolve()

        return next()
      }),
      mock().mockResolvedValueOnce(new Response('OK')),
    ]

    const result = await executeMiddlewareChain(REQ, chain)
    const output = await result.text()

    expect(output).toBe('OK')
    expect(chain[0]).toHaveBeenCalledOnce()
    expect(chain[0]).toHaveBeenCalledWith(REQ, {}, expect.any(Function))
    expect(chain[1]).toHaveBeenCalledOnce()
    expect(chain[1]).toHaveBeenCalledWith(REQ, {}, null)
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

    const fn = () => executeMiddlewareChain({}, chain)

    expect(fn).toThrow(err)
  })
})
