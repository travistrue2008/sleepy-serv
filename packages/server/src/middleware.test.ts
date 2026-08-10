import {
  mock,
  spyOn,
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
} from 'bun:test'

import {
  parseJsonBody,
  setValidationFormats,
  validateSchemas,
  resetValidationFormatsState,
} from './middleware'

import {
  BadRequestError,
  UnsupportedMediaTypeError,
  UnprocessableContentError,
} from './errors'

import { HttpMethod } from './utils'

import type { WebSocketRequest } from './utils'

const BASE_REQUEST: WebSocketRequest = {
  id: '00000000-0000-0000-0000-000000000000',
  clientId: '00000000-0000-0000-0000-000000000001',
  method: HttpMethod.Get,
  route: '/',
  headers: new Headers(),
  params: {},
  query: {},
  json: async () => null,
}

describe('parseJsonBody()', () => {
  const parser = parseJsonBody()

  test('when "next" is NOT provided', async () => {
    const req = {
      ...BASE_REQUEST,
      headers: new Headers({}),
    }

    const fn = () => parser(req, null, null)

    await expect(fn).toThrow(
      new TypeError('Middleware cannot be the last entry in a chain'),
    )
  })

  test('when NO "content-type" is provided', async () => {
    const req = {
      ...BASE_REQUEST,
      method: HttpMethod.Post,
      headers: new Headers({}),
      json: mock().mockResolvedValue(undefined),
    }

    const next = mock()

    await parser(req, null, next)

    expect(req.json).not.toBeCalled()
    expect(next).toHaveBeenCalledWith(null)
  })

  test('when "content-type" is NOT "application/json"', async () => {
    const req = {
      ...BASE_REQUEST,
      method: HttpMethod.Post,
      headers: new Headers({
        'content-type': 'application/xml',
      }),
      json: mock().mockResolvedValue(undefined),
    }

    const next = mock()
    const fn = () => parser(req, null, next)

    await expect(fn).toThrow(new UnsupportedMediaTypeError('content-type'))

    expect(req.json).not.toBeCalled()
    expect(next).not.toHaveBeenCalled()
  })

  test('when body JSON is invalid', async () => {
    const req = {
      ...BASE_REQUEST,
      method: HttpMethod.Post,
      headers: new Headers({
        'content-type': 'application/json;charset=utf-8',
      }),
      json: mock().mockRejectedValue(new Error('Cannot parse JSON')),
    }

    const next = mock()
    const fn = () => parser(req, null, next)

    await expect(fn).toThrow(new BadRequestError('Invalid JSON'))

    expect(req.json).toHaveBeenCalledOnce()
    expect(next).not.toHaveBeenCalled()
  })

  test('when invoked', async () => {
    const BODY = {
      a: 'asdf',
    }

    const req = {
      ...BASE_REQUEST,
      method: HttpMethod.Post,
      headers: new Headers({
        'content-type': 'application/json;charset=utf-8',
      }),
      json: mock().mockResolvedValue(BODY),
    }

    const next = mock()

    await parser(req, null, next)

    expect(req.json).toBeCalledWith()
    expect(next).toHaveBeenCalledWith(BODY)
  })

  test('when the content-type has no charset', async () => {
    const BODY = {
      a: 'asdf',
    }

    const req = {
      ...BASE_REQUEST,
      method: HttpMethod.Post,
      headers: new Headers({
        'content-type': 'application/json;charset=utf-8',
      }),
      json: mock().mockResolvedValue(BODY),
    }

    const next = mock()

    await parser(req, null, next)

    expect(req.json).toHaveBeenCalledOnce()
    expect(next).toHaveBeenCalledWith(BODY)
  })
})

describe('setValidationFormats()', () => {
  beforeEach(() => {
    resetValidationFormatsState()
    spyOn(console, 'warn')
  })

  afterEach(() => {
    mock.restore()
  })

  test('when invoked multiple times', () => {
    setValidationFormats({})
    setValidationFormats({})

    expect(console.warn).toHaveBeenCalledOnce()

    expect(console.warn).toHaveBeenCalledWith(
      'setValidationFormats() - already initialized',
    )
  })

  test('when invoked after validateSchemas() is called', () => {
    validateSchemas({})
    setValidationFormats({})

    expect(console.warn).toHaveBeenCalledOnce()

    expect(console.warn).toHaveBeenCalledWith(
      'setValidationFormats() - called after compilation',
    )
  })

  test('when invoked', () => {
    setValidationFormats({
      phone: /^\d{10}$/,
    })

    const middleware = validateSchemas({
      body: {
        properties: {
          phone: {
            type: 'string',
            format: 'phone',
          },
        },
      },
    })

    const next = mock()

    const fn = () => middleware({
      ...BASE_REQUEST,
      headers: new Headers(),
      params: {},
      query: {},
    }, null, next)

    expect(fn).not.toThrow()
    expect(next).toHaveBeenCalledWith(null)
  })
})

describe('validateSchemas()', () => {
  const UUID = '00000000-0000-0000-0000-000000000001'

  test('when "next" is NOT provided', () => {
    const middleware = validateSchemas({})
    const fn = () => middleware(BASE_REQUEST, null, null)

    expect(fn).toThrow(
      new TypeError('Middleware cannot be the last entry in a chain'),
    )
  })

  const PATTERN_UUID =
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$'

  const SCHEMA_FORMAT = {
    userId: {
      type: 'format',
      value: 'uuid',
    },
  }

  const SCHEMA_PATTERN = {
    userId: {
      type: 'pattern',
      value: PATTERN_UUID,
    },
  }

  const SCHEMA_BODY = {
    type: 'object',
    properties: {
      firstName: { type: 'string' },
      lastName: { type: 'string' },
      middleName: { type: 'string' },
      dob: {
        type: 'string',
        format: 'date',
      },
    },
    required: [
      'firstName',
      'lastName',
      'dob',
    ],
  }

  test('when NO schemas are provided', () => {
    const middleware = validateSchemas({})

    const req = {
      ...BASE_REQUEST,
      headers: new Headers(),
      params: {},
      query: {},
    }

    const res = { a: 1 }
    const next = mock()
    const fn = () => middleware(req, res, next)

    expect(fn).not.toThrow()
    expect(next).toHaveBeenCalledWith(res)
  })

  test('when headers FAIL validation (format)', () => {
    const middleware = validateSchemas({
      headers: SCHEMA_FORMAT,
    })

    const req = {
      ...BASE_REQUEST,
      headers: new Headers({
        userId: '123',
      }),
      params: {},
      query: {},
    }

    const res = { a: 1 }
    const next = mock()
    const fn = () => middleware(req, res, next)

    expect(fn).toThrow(new UnprocessableContentError([
      {
        path: 'headers.userid',
        message: 'must match format "uuid"',
      },
    ]))

    expect(next).not.toHaveBeenCalled()
  })

  test('when headers PASSES validation (format)', () => {
    const middleware = validateSchemas({
      headers: SCHEMA_FORMAT,
    })

    const req = {
      ...BASE_REQUEST,
      headers: new Headers({
        userId: UUID,
      }),
      params: {},
      query: {},
    }

    const res = { a: 1 }
    const next = mock()

    const fn = () => middleware(req, res, next)

    expect(fn).not.toThrow()
    expect(next).toHaveBeenCalledWith(res)
  })

  test('when a header schema key casing differs from the header', () => {
    const middleware = validateSchemas({
      headers: SCHEMA_FORMAT,
    })

    const req = {
      ...BASE_REQUEST,
      headers: new Headers({
        USERID: '123',
      }),
      params: {},
      query: {},
    }

    const res = { a: 1 }
    const next = mock()
    const fn = () => middleware(req, res, next)

    expect(fn).toThrow(new UnprocessableContentError([
      {
        path: 'headers.userid',
        message: 'must match format "uuid"',
      },
    ]))

    expect(next).not.toHaveBeenCalled()
  })

  test('when headers FAIL validation (pattern)', () => {
    const middleware = validateSchemas({
      headers: SCHEMA_PATTERN,
    })

    const req = {
      ...BASE_REQUEST,
      headers: new Headers({
        userId: '123',
      }),
      params: {},
      query: {},
    }

    const res = { a: 1 }
    const next = mock()

    const fn = () => middleware(req, res, next)

    expect(fn).toThrow(new UnprocessableContentError([
      {
        path: 'headers.userid',
        message: `must match pattern "${PATTERN_UUID}"`,
      },
    ]))

    expect(next).not.toHaveBeenCalled()
  })

  test('when headers PASSES validation (pattern)', () => {
    const middleware = validateSchemas({
      headers: SCHEMA_PATTERN,
    })

    const req = {
      ...BASE_REQUEST,
      headers: new Headers({
        userId: UUID,
      }),
      params: {},
      query: {},
    }

    const res = {a: 1 }
    const next = mock()
    const fn = () => middleware(req, res, next)

    expect(fn).not.toThrow()
    expect(next).toHaveBeenCalledWith(res)
  })

  test('when params FAIL validation (format)', () => {
    const middleware = validateSchemas({
      params: SCHEMA_FORMAT,
    })

    const req = {
      ...BASE_REQUEST,
      headers: new Headers(),
      params: {
        userId: '123',
      },
      query: {},
    }

    const res = { a: 1 }
    const next = mock()
    const fn = () => middleware(req, res, next)

    expect(fn).toThrow(new UnprocessableContentError([
      {
        path: 'params.userId',
        message: 'must match format "uuid"',
      },
    ]))

    expect(next).not.toHaveBeenCalled()
  })

  test('when params PASSES validation (format)', () => {
    const middleware = validateSchemas({
      params: SCHEMA_FORMAT,
    })

    const req = {
      ...BASE_REQUEST,
      headers: new Headers(),
      params: {
        userId: UUID,
      },
      query: {},
    }

    const res = { a: 1 }
    const next = mock()
    const fn = () => middleware(req, res, next)

    expect(fn).not.toThrow()

    expect(next).toHaveBeenCalledWith(res)
  })

  test('when params FAIL validation (pattern)', () => {
    const middleware = validateSchemas({
      params: SCHEMA_PATTERN,
    })

    const req = {
      ...BASE_REQUEST,
      headers: new Headers(),
      params: {
        userId: '123',
      },
      query: {},
    }

    const res = { a: 1 }
    const next = mock()
    const fn = () => middleware(req, res, next)

    expect(fn).toThrow(new UnprocessableContentError([
      {
        path: 'params.userId',
        message: `must match pattern "${PATTERN_UUID}"`,
      },
    ]))

    expect(next).not.toHaveBeenCalled()
  })

  test('when params PASSES validation (pattern)', () => {
    const middleware = validateSchemas({
      params: SCHEMA_PATTERN,
    })

    const req = {
      ...BASE_REQUEST,
      headers: new Headers(),
      params: {
        userId: UUID,
      },
      query: {},
    }

    const res = { a: 1 }
    const next = mock()
    const fn = () => middleware(req, res, next)

    expect(fn).not.toThrow()

    expect(next).toHaveBeenCalledWith(res)
  })

  test('when query FAIL validation (format)', () => {
    const middleware = validateSchemas({
      query: SCHEMA_FORMAT,
    })

    const req = {
      ...BASE_REQUEST,
      headers: new Headers(),
      params: {},
      query: {
        userId: '123',
      },
    }

    const res = { a: 1 }
    const next = mock()
    const fn = () => middleware(req, res, next)

    expect(fn).toThrow(new UnprocessableContentError([
      {
        path: 'query.userId',
        message: 'must match format "uuid"',
      },
    ]))

    expect(next).not.toHaveBeenCalled()
  })

  test('when query PASSES validation (format)', () => {
    const middleware = validateSchemas({
      query: SCHEMA_FORMAT,
    })

    const req = {
      ...BASE_REQUEST,
      headers: new Headers(),
      params: {},
      query: {
        userId: UUID,
      },
    }

    const res = { a: 1 }
    const next = mock()
    const fn = () => middleware(req, res, next)

    expect(fn).not.toThrow()
    expect(next).toHaveBeenCalledWith(res)
  })

  test('when query FAIL validation (pattern)', () => {
    const middleware = validateSchemas({
      query: SCHEMA_PATTERN,
    })

    const req = {
      ...BASE_REQUEST,
      headers: new Headers(),
      params: {},
      query: {
        userId: '123',
      },
    }

    const res = { a: 1 }
    const next = mock()
    const fn = () => middleware(req, res, next)

    expect(fn).toThrow(new UnprocessableContentError([
      {
        path: 'query.userId',
        message: `must match pattern "${PATTERN_UUID}"`,
      },
    ]))

    expect(next).not.toHaveBeenCalled()
  })

  test('when query PASSES validation (pattern)', () => {
    const middleware = validateSchemas({
      query: SCHEMA_PATTERN,
    })

    const req = {
      ...BASE_REQUEST,
      headers: new Headers(),
      params: {},
      query: {
        userId: UUID,
      },
    }

    const res = { a: 1 }
    const next = mock()
    const fn = () => middleware(req, res, next)

    expect(fn).not.toThrow()
    expect(next).toHaveBeenCalledOnce()
  })

  test('when body FAILS validation', () => {
    const middleware = validateSchemas({
      body: SCHEMA_BODY,
    })

    const req = {
      ...BASE_REQUEST,
      headers: new Headers(),
      params: {},
      query: {},
    }

    const res = { a: 1 }
    const next = mock()
    const fn = () => middleware(req, res, next)

    expect(fn).toThrow(new UnprocessableContentError([
      {
        path: 'body',
        message: 'must have required property \'firstName\'',
      },
      {
        path: 'body',
        message: 'must have required property \'lastName\'',
      },
      {
        path: 'body',
        message: 'must have required property \'dob\'',
      },
    ]))

    expect(next).not.toHaveBeenCalled()
  })

  test('when body PASSES validation', () => {
    const middleware = validateSchemas({
      body: SCHEMA_BODY,
    })

    const req = {
      ...BASE_REQUEST,
      headers: new Headers(),
      params: {},
      query: {},
    }

    const res = {
      firstName: 'Tony',
      lastName: 'Stark',
      middleName: 'Edward',
      dob: '2000-01-01',
    }

    const next = mock()
    const fn = () => middleware(req, res, next)

    expect(fn).not.toThrow()

    expect(next).toHaveBeenCalledWith({
      firstName: 'Tony',
      lastName: 'Stark',
      middleName: 'Edward',
      dob: '2000-01-01',
    })
  })

  test('when body contains extra fields (root)', () => {
    const req = {
      ...BASE_REQUEST,
      headers: new Headers(),
      params: {},
      query: {},
    }

    const res: Record<string, unknown> = {
      firstName: 'Some',
      lastName: 'One',
      middleName: 'Else',
    }

    const middleware = validateSchemas({
      body: {
        type: 'object',
        properties: {
          firstName: { type: 'string' },
          lastName: { type: 'string' },
        },
      },
    })

    const next = mock()

    middleware(req, res, next)

    expect(res).toStrictEqual({
      firstName: 'Some',
      lastName: 'One',
    })

    expect(next).toHaveBeenCalledWith(res)
  })

  test('when body contains extra fields (sub-key)', () => {
    const req = {
      ...BASE_REQUEST,
      headers: new Headers(),
      params: {},
      query: {},
    }

    const res: Record<string, unknown> = {
      stats: {
        strength: 12,
        defense: 8,
      },
    }

    const middleware = validateSchemas({
      body: {
        type: 'object',
        properties: {
          stats: {
            type: 'object',
            properties: {
              strength: {
                type: 'number',
              },
            },
          },
        },
      },
    })

    const next = mock()

    middleware(req, res, next)

    expect(res).toStrictEqual({
      stats: {
        strength: 12,
      },
    })

    expect(next).toHaveBeenCalledWith(res)
  })

  test('when a null value for a nullable field is provided', () => {
    const req = {
      ...BASE_REQUEST,
      headers: new Headers(),
      params: {},
      query: {},
    }

    const res = {
      dob: null,
    }

    const middleware = validateSchemas({
      body: {
        type: 'object',
        properties: {
          dob: {
            type: ['string', 'null'],
            format: 'date',
          },
        },
      },
    })

    const next = mock()

    middleware(req, res, next)

    expect(res).toStrictEqual({ dob: null })
    expect(next).toHaveBeenCalledWith(res)
  })
})
