import { describe, test, expect, mock } from 'bun:test'

import {
  parseJson,
  setValidationFormats,
  validateSchema,
} from './middleware'

import {
  BadRequestError,
  UnsupportedMediaTypeError,
  UnprocessableContentError,
} from './errors'

describe('parseJson()', () => {
  test('when NO "content-type" is provided', async () => {
    const req = {
      method: 'POST',
      headers: new Headers({}),
      json: mock().mockResolvedValue(),
    }

    const next = mock()

    await parseJson(req, null, next)

    expect(req.json).not.toBeCalled()
    expect(next).toHaveBeenCalledWith(null)
  })

  test('when "content-type" is NOT "application/json"', async () => {
    const req = {
      method: 'POST',
      headers: new Headers({
        'content-type': 'application/xml',
      }),
      json: mock().mockResolvedValue(),
    }

    const next = mock()
    const fn = () => parseJson(req, null, next)

    await expect(fn).toThrow(new UnsupportedMediaTypeError('content-type'))

    expect(req.json).not.toBeCalled()
    expect(next).not.toHaveBeenCalled()
  })

  test('when body JSON is invalid', async () => {
    const req = {
      method: 'POST',
      headers: new Headers({
        'content-type': 'application/json;charset=utf-8',
      }),
      json: mock().mockRejectedValue(new Error('Cannot parse JSON')),
    }

    const next = mock()
    const fn = () => parseJson(req, null, next)

    await expect(fn).toThrow(new BadRequestError('Invalid JSON'))

    expect(req.json).toHaveBeenCalledOnce()
    expect(next).not.toHaveBeenCalled()
  })

  test('when invoked', async () => {
    const BODY = {
      a: 'asdf',
    }

    const req = {
      method: 'POST',
      headers: new Headers({
        'content-type': 'application/json;charset=utf-8',
      }),
      json: mock().mockResolvedValue(BODY),
    }

    const next = mock()

    await parseJson(req, null, next)

    expect(req.json).toBeCalledWith()
    expect(next).toHaveBeenCalledWith(BODY)
  })

  test('when the content-type has no charset', async () => {
    const BODY = {
      a: 'asdf',
    }

    const req = {
      method: 'POST',
      headers: new Headers({
        'content-type': 'application/json',
      }),
      json: mock().mockResolvedValue(BODY),
    }

    const next = mock()

    await parseJson(req, null, next)

    expect(req.json).toHaveBeenCalledOnce()
    expect(next).toHaveBeenCalledWith(BODY)
  })
})

describe('setValidationFormats()', () => {
  test('when invoked', () => {
    setValidationFormats({
      phone: /^\d{10}$/,
    })

    const middleware = validateSchema({
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
      headers: {},
      params: {},
      query: {},
    }, null, next)

    expect(fn).not.toThrow()
    expect(next).toHaveBeenCalledWith(null)
  })
})

describe('validateSchema()', () => {
  const UUID = '00000000-0000-0000-0000-000000000001'

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
    const middleware = validateSchema({})
    const next = mock()

    const fn = () => middleware({
      headers: {},
      params: {},
      query: {},
    }, null, next)

    expect(fn).not.toThrow()
    expect(next).toHaveBeenCalledWith(null)
  })

  test('when headers FAIL validation (format)', () => {
    const middleware = validateSchema({
      headers: SCHEMA_FORMAT,
    })

    const next = mock()

    const fn = () => middleware({
      headers: {
        userId: '123',
      },
      params: {},
      query: {},
    }, null, next)

    expect(fn).toThrow(new UnprocessableContentError([
      {
        path: 'headers.userId',
        message: 'must match format "uuid"',
      },
    ]))

    expect(next).not.toHaveBeenCalled()
  })

  test('when headers PASS validation (format)', () => {
    const middleware = validateSchema({
      headers: SCHEMA_FORMAT,
    })

    const next = mock()

    const fn = () => middleware({
      headers: {
        userId: UUID,
      },
      params: {},
      query: {},
    }, null, next)

    expect(fn).not.toThrow()
    expect(next).toHaveBeenCalledWith(null)
  })

  test('when headers FAIL validation (pattern)', () => {
    const middleware = validateSchema({
      headers: SCHEMA_PATTERN,
    })

    const next = mock()

    const fn = () => middleware({
      headers: {
        userId: '123',
      },
      params: {},
      query: {},
    }, null, next)

    expect(fn).toThrow(new UnprocessableContentError([
      {
        path: 'headers.userId',
        message: `must match pattern "${PATTERN_UUID}"`,
      },
    ]))

    expect(next).not.toHaveBeenCalled()
  })

  test('when headers PASS validation (pattern)', () => {
    const middleware = validateSchema({
      headers: SCHEMA_PATTERN,
    })

    const next = mock()

    const fn = () => middleware({
      headers: {
        userId: UUID,
      },
      params: {},
      query: {},
    }, null, next)

    expect(fn).not.toThrow()
    expect(next).toHaveBeenCalledWith(null)
  })

  test('when params FAIL validation (format)', () => {
    const middleware = validateSchema({
      params: SCHEMA_FORMAT,
    })

    const next = mock()

    const fn = () => middleware({
      headers: {},
      params: {
        userId: '123',
      },
      query: {},
    }, null, next)

    expect(fn).toThrow(new UnprocessableContentError([
      {
        path: 'params.userId',
        message: 'must match format "uuid"',
      },
    ]))

    expect(next).not.toHaveBeenCalled()
  })

  test('when params PASS validation (format)', () => {
    const middleware = validateSchema({
      params: SCHEMA_FORMAT,
    })

    const next = mock()

    const fn = () => middleware({
      headers: {},
      params: {
        userId: UUID,
      },
      query: {},
    }, null, next)

    expect(fn).not.toThrow()

    expect(next).toHaveBeenCalledWith(null)
  })

  test('when params FAIL validation (pattern)', () => {
    const middleware = validateSchema({
      params: SCHEMA_PATTERN,
    })

    const next = mock()

    const fn = () => middleware({
      headers: {},
      params: {
        userId: '123',
      },
      query: {},
    }, null, next)

    expect(fn).toThrow(new UnprocessableContentError([
      {
        path: 'params.userId',
        message: `must match pattern "${PATTERN_UUID}"`,
      },
    ]))

    expect(next).not.toHaveBeenCalled()
  })

  test('when params PASS validation (pattern)', () => {
    const middleware = validateSchema({
      params: SCHEMA_PATTERN,
    })

    const next = mock()

    const fn = () => middleware({
      headers: {},
      params: {
        userId: UUID,
      },
      query: {},
    }, null, next)

    expect(fn).not.toThrow()

    expect(next).toHaveBeenCalledWith(null)
  })

  test('when query FAIL validation (format)', () => {
    const middleware = validateSchema({
      query: SCHEMA_FORMAT,
    })

    const next = mock()

    const fn = () => middleware({
      headers: {},
      params: {},
      query: {
        userId: '123',
      },
    }, null, next)

    expect(fn).toThrow(new UnprocessableContentError([
      {
        path: 'query.userId',
        message: 'must match format "uuid"',
      },
    ]))

    expect(next).not.toHaveBeenCalled()
  })

  test('when query PASS validation (format)', () => {
    const middleware = validateSchema({
      query: SCHEMA_FORMAT,
    })

    const next = mock()

    const fn = () => middleware({
      headers: {},
      params: {},
      query: {
        userId: UUID,
      },
    }, null, next)

    expect(fn).not.toThrow()
    expect(next).toHaveBeenCalledWith(null)
  })

  test('when query FAIL validation (pattern)', () => {
    const middleware = validateSchema({
      query: SCHEMA_PATTERN,
    })

    const next = mock()

    const fn = () => middleware({
      headers: {},
      params: {},
      query: {
        userId: '123',
      },
    }, null, next)

    expect(fn).toThrow(new UnprocessableContentError([
      {
        path: 'query.userId',
        message: `must match pattern "${PATTERN_UUID}"`,
      },
    ]))

    expect(next).not.toHaveBeenCalled()
  })

  test('when query PASS validation (pattern)', () => {
    const middleware = validateSchema({
      query: SCHEMA_PATTERN,
    })

    const next = mock()

    const fn = () => middleware({
      headers: {},
      params: {},
      query: {
        userId: UUID,
      },
    }, null, next)

    expect(fn).not.toThrow()
    expect(next).toHaveBeenCalledOnce()
  })

  test('when body FAILS validation', () => {
    const middleware = validateSchema({
      body: SCHEMA_BODY,
    })

    const next = mock()

    const fn = () => middleware({
      headers: {},
      params: {},
      query: {},
    }, {}, next)

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
    const middleware = validateSchema({
      body: SCHEMA_BODY,
    })

    const next = mock()

    const fn = () => middleware({
      headers: {},
      params: {},
      query: {},
    }, {
      firstName: 'Tony',
      lastName: 'Stark',
      middleName: 'Edward',
      dob: '2000-01-01',
    }, next)

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
      headers: {},
      params: {},
      query: {},
    }

    const res = {
      firstName: 'Some',
      lastName: 'One',
      middleName: 'Else',
    }

    const middleware = validateSchema({
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
      headers: {},
      params: {},
      query: {},
    }

    const res = {
      stats: {
        strength: 12,
        defense: 8,
      },
    }

    const middleware = validateSchema({
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
      headers: {},
      params: {},
      query: {},
    }

    const res = {
      dob: null,
    }

    const middleware = validateSchema({
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
