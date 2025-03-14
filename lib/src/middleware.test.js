import {
  describe,
  test,
  expect,
  mock,
} from 'bun:test'

import {
  parseJson,
  setValidationFormats,
  validateSchema,
} from './middleware'

import {
  UnsupportedMediaTypeError,
  UnprocessableContentError,
} from './errors'

describe('parseJson()', () => {
  test('when the method IS NOT "GET" AND "content-type" is incorrect', async () => {
    const req = {
      method: 'POST',
      json: mock(),
      headers: new Headers({
        'content-type': 'application/xml',
      }),
    }

    const res = {}

    const fn = () => parseJson(req, res)

    await expect(fn).toThrow(new UnsupportedMediaTypeError('content-type'))

    expect(req.json).not.toBeCalled()
  })

  test('when the method IS "GET" AND "content-type" is incorrect', async () => {
    const req = {
      method: 'GET',
      json: mock(),
      headers: new Headers({
        'content-type': 'application/xml',
      }),
    }

    const res = {}

    await parseJson(req, res)

    expect(req.json).toBeCalledWith()
  })

  test('when the method IS NOT "GET" AND "content-type" is "text/javascript"', async () => {
    const req = {
      json: mock(),
      method: 'POST',
      headers: new Headers({
        'content-type': 'application/json',
      }),
    }

    const res = {}

    await parseJson(req, res)

    expect(req.json).toBeCalledWith()
  })

  test('when the method IS "GET" AND "content-type" is "text/javascript"', async () => {
    const req = {
      json: mock(),
      method: 'GET',
      headers: new Headers({
        'content-type': 'application/json',
      }),
    }

    const res = {}

    await parseJson(req, res)

    expect(req.json).toBeCalledWith()
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

    const fn = () => middleware({
      headers: {},
      params: {},
      query: {},
    }, {
      body: {},
    })

    expect(fn).not.toThrow()
  })
})

describe('validateSchema()', () => {
  const UUID = '3e4666bf-d5e5-4aa7-b8ce-cefe41c7568a'
  const PATTERN_UUID = '^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$'

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

    const fn = () => middleware({
      headers: {},
      params: {},
      query: {},
    }, {
      body: {},
    })

    expect(fn).not.toThrow()
  })

  test('when headers FAIL validation (format)', () => {
    const middleware = validateSchema({
      headers: SCHEMA_FORMAT,
    })

    const fn = () => middleware({
      headers: {
        userId: '123',
      },
      params: {},
      query: {},
    }, {
      body: {},
    })

    expect(fn).toThrow(new UnprocessableContentError([{
      path: 'headers.userId',
      message: 'must match format "uuid"',
    }]))
  })

  test('when headers PASS validation (format)', () => {
    const middleware = validateSchema({
      headers: SCHEMA_FORMAT,
    })

    const fn = () => middleware({
      headers: {
        userId: UUID,
      },
      params: {},
      query: {},
    }, {
      body: {},
    })

    expect(fn).not.toThrow()
  })

  test('when headers FAIL validation (pattern)', () => {
    const middleware = validateSchema({
      headers: SCHEMA_PATTERN,
    })

    const fn = () => middleware({
      headers: {
        userId: '123',
      },
      params: {},
      query: {},
    }, {
      body: {},
    })

    expect(fn).toThrow(new UnprocessableContentError([{
      path: 'headers.userId',
      message: `must match pattern "${PATTERN_UUID}"`,
    }]))
  })

  test('when headers PASS validation (pattern)', () => {
    const middleware = validateSchema({
      headers: SCHEMA_PATTERN,
    })

    const fn = () => middleware({
      headers: {
        userId: UUID,
      },
      params: {},
      query: {},
    }, {
      body: {},
    })

    expect(fn).not.toThrow()
  })

  test('when params FAIL validation (format)', () => {
    const middleware = validateSchema({
      params: SCHEMA_FORMAT,
    })

    const fn = () => middleware({
      headers: {},
      params: {
        userId: '123',
      },
      query: {},
    }, {
      body: {},
    })

    expect(fn).toThrow(new UnprocessableContentError([{
      path: 'params.userId',
      message: 'must match format "uuid"',
    }]))
  })

  test('when params PASS validation (format)', () => {
    const middleware = validateSchema({
      params: SCHEMA_FORMAT,
    })

    const fn = () => middleware({
      headers: {},
      params: {
        userId: UUID,
      },
      query: {},
    }, {
      body: {},
    })

    expect(fn).not.toThrow()
  })

  test('when params FAIL validation (pattern)', () => {
    const middleware = validateSchema({
      params: SCHEMA_PATTERN,
    })

    const fn = () => middleware({
      headers: {},
      params: {
        userId: '123',
      },
      query: {},
    }, {
      body: {},
    })

    expect(fn).toThrow(new UnprocessableContentError([{
      path: 'params.userId',
      message: `must match pattern "${PATTERN_UUID}"`,
    }]))
  })

  test('when params PASS validation (pattern)', () => {
    const middleware = validateSchema({
      params: SCHEMA_PATTERN,
    })

    const fn = () => middleware({
      headers: {},
      params: {
        userId: UUID,
      },
      query: {},
    }, {
      body: {},
    })

    expect(fn).not.toThrow()
  })

  test('when query FAIL validation (format)', () => {
    const middleware = validateSchema({
      query: SCHEMA_FORMAT,
    })

    const fn = () => middleware({
      headers: {},
      params: {},
      query: {
        userId: '123',
      },
    }, {
      body: {},
    })

    expect(fn).toThrow(new UnprocessableContentError([{
      path: 'query.userId',
      message: 'must match format "uuid"',
    }]))
  })

  test('when query PASS validation (format)', () => {
    const middleware = validateSchema({
      query: SCHEMA_FORMAT,
    })

    const fn = () => middleware({
      headers: {},
      params: {},
      query: {
        userId: UUID,
      },
    }, {
      body: {},
    })

    expect(fn).not.toThrow()
  })

  test('when query FAIL validation (pattern)', () => {
    const middleware = validateSchema({
      query: SCHEMA_PATTERN,
    })

    const fn = () => middleware({
      headers: {},
      params: {},
      query: {
        userId: '123',
      },
    }, {
      body: {},
    })

    expect(fn).toThrow(new UnprocessableContentError([{
      path: 'query.userId',
      message: `must match pattern "${PATTERN_UUID}"`,
    }]))
  })

  test('when query PASS validation (pattern)', () => {
    const middleware = validateSchema({
      query: SCHEMA_PATTERN,
    })

    const fn = () => middleware({
      headers: {},
      params: {},
      query: {
        userId: UUID,
      },
    }, {
      body: {},
    })

    expect(fn).not.toThrow()
  })

  test('when body FAILS validation', () => {
    const middleware = validateSchema({
      body: SCHEMA_BODY,
    })

    const fn = () => middleware({
      headers: {},
      params: {},
      query: {},
    }, {
      body: {},
    })

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
  })

  test('when body PASSES validation', () => {
    const middleware = validateSchema({
      body: SCHEMA_BODY,
    })

    const fn = () => middleware({
      headers: {},
      params: {},
      query: {},
    }, {
      body: {
        firstName: 'Tony',
        lastName: 'Stark',
        middleName: 'Edward',
        dob: '2000-01-01',
      },
    })

    expect(fn).not.toThrow()
  })

  test('when body contains extra fields (root)', () => {
    const req = {
      headers: {},
      params: {},
      query: {},
    }

    const res = {
      body: {
        firstName: 'Some',
        lastName: 'One',
        middleName: 'Else',
      },
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

    middleware(req, res)

    expect(res.body).toStrictEqual({
      firstName: 'Some',
      lastName: 'One',
    })
  })

  test('when body contains extra fields (sub-key)', () => {
    const req = {
      headers: {},
      params: {},
      query: {},
    }

    const res = {
      body: {
        stats: {
          strength: 12,
          defense: 8,
        },
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

    middleware(req, res)

    expect(res.body).toStrictEqual({
      stats: {
        strength: 12,
      },
    })
  })

  test('when a null value for a nullable field is provided', () => {
    const req = {
      headers: {},
      params: {},
      query: {},
    }

    const res = {
      body: {
        dob: null
      },
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

    middleware(req, res)

    expect(res.body).toStrictEqual({ dob: null })
  })
})
