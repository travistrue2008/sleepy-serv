import * as uuid from 'uuid'
import { describe, test, expect } from 'bun:test'
import { UnprocessableContentError } from './errors'
import { TYPES, createMessage, validateRequest } from './messages'

const ID = uuid.v4()
const STATUS = 200
const METHOD = 'GET'
const ROUTE = '/users/123'
const TIMESTAMP = '2000-01-01T00:00:00.000Z'
const HEADERS = new Headers({ a: 1 })

describe('createMessage()', () => {
  test('when NO "opts" are provided', () => {
    const res = createMessage(TYPES.RESPONSE)

    expect(res).toStrictEqual({
      id: res.id,
      type: TYPES.RESPONSE,
      timestamp: TIMESTAMP,
      headers: new Headers(),
      body: null,
    })
  })

  test('when "opts.id" is provided', () => {
    const res = createMessage(TYPES.RESPONSE, { id: ID })

    expect(res).toStrictEqual({
      id: ID,
      type: TYPES.RESPONSE,
      timestamp: TIMESTAMP,
      headers: new Headers(),
      body: null,
    })
  })

  test('when "opts.headers" is provided', () => {
    const res = createMessage(TYPES.RESPONSE, {
      headers: HEADERS,
    })

    expect(res).toStrictEqual({
      id: res.id,
      type: TYPES.RESPONSE,
      timestamp: TIMESTAMP,
      headers: HEADERS,
      body: null,
    })
  })

  test('when "opts.body" is provided', () => {
    const BODY = { a: 1 }

    const res = createMessage(TYPES.RESPONSE, {
      body: BODY,
    })

    expect(res).toStrictEqual({
      id: res.id,
      type: TYPES.RESPONSE,
      timestamp: TIMESTAMP,
      headers: new Headers(),
      body: BODY,
    })
  })

  test('when extra "opts" are provided', () => {
    const res = createMessage(TYPES.RESPONSE, {
      method: METHOD,
      status: STATUS,
    })

    expect(res).toStrictEqual({
      id: res.id,
      type: TYPES.RESPONSE,
      timestamp: TIMESTAMP,
      method: METHOD,
      status: STATUS,
      headers: new Headers(),
      body: null,
    })
  })
})

describe('validateRequest()', () => {
  const MESSAGE_VALID = {
    id: ID,
    type: TYPES.REQUEST,
    method: METHOD,
    route: ROUTE,
    timestamp: TIMESTAMP,
    headers: new Headers(),
    query: {},
    body: null,
  }

  test('when the "id" field is missing', () => {
    const fn = () => validateRequest({
      ...MESSAGE_VALID,
      id: undefined,
    })

    expect(fn).toThrow(new UnprocessableContentError([
      {
        path: '',
        message: `must have required property 'id'`,
      },
    ]))
  })

  test('when the "id" field is invalid', () => {
    const fn = () => validateRequest({
      ...MESSAGE_VALID,
      id: 'invalid',
    })

    expect(fn).toThrow(new UnprocessableContentError([
      {
        path: 'id',
        message: 'must match format "uuid"',
      },
    ]))
  })

  test('when the "type" field is missing', () => {
    const fn = () => validateRequest({
      ...MESSAGE_VALID,
      type: undefined,
    })

    expect(fn).toThrow(new UnprocessableContentError([
      {
        path: '',
        message: `must have required property 'type'`,
      },
    ]))
  })

  test('when the "type" field is invalid', () => {
    const fn = () => validateRequest({
      ...MESSAGE_VALID,
      type: 'invalid',
    })

    expect(fn).toThrow(new UnprocessableContentError([
      {
        path: 'type',
        message: 'must be equal to constant',
      },
    ]))
  })

  test('when the "method" field is missing', () => {
    const fn = () => validateRequest({
      ...MESSAGE_VALID,
      method: undefined,
    })

    expect(fn).toThrow(new UnprocessableContentError([
      {
        path: '',
        message: `must have required property 'method'`,
      },
    ]))
  })

  test('when the "method" field is invalid', () => {
    const fn = () => validateRequest({
      ...MESSAGE_VALID,
      method: 'invalid',
    })

    expect(fn).toThrow(new UnprocessableContentError([
      {
        path: 'method',
        message: 'must be equal to one of the allowed values',
      },
    ]))
  })

  test('when the "route" field is missing', () => {
    const fn = () => validateRequest({
      ...MESSAGE_VALID,
      route: undefined,
    })

    expect(fn).toThrow(new UnprocessableContentError([
      {
        path: '',
        message: `must have required property 'route'`,
      },
    ]))
  })

  test('when the "route" field is invalid', () => {
    const fn = () => validateRequest({
      ...MESSAGE_VALID,
      route: 'invalid route',
    })

    expect(fn).toThrow(new UnprocessableContentError([
      {
        path: 'route',
        message: 'must match format "uri-reference"',
      },
    ]))
  })

  test('when the "timestamp" field is missing', () => {
    const fn = () => validateRequest({
      ...MESSAGE_VALID,
      timestamp: undefined,
    })

    expect(fn).toThrow(new UnprocessableContentError([
      {
        path: '',
        message: `must have required property 'timestamp'`,
      },
    ]))
  })

  test('when the "timestamp" field is invalid', () => {
    const fn = () => validateRequest({
      ...MESSAGE_VALID,
      timestamp: '2000-01-01',
    })

    expect(fn).toThrow(new UnprocessableContentError([
      {
        path: 'timestamp',
        message: 'must match format "date-time"',
      },
    ]))
  })

  test('when the "headers" field is missing', () => {
    const fn = () => validateRequest({
      ...MESSAGE_VALID,
      headers: undefined,
    })

    expect(fn).toThrow(new UnprocessableContentError([
      {
        path: '',
        message: `must have required property 'headers'`,
      },
    ]))
  })

  test('when the "headers" field is invalid (null)', () => {
    const fn = () => validateRequest({
      ...MESSAGE_VALID,
      headers: null,
    })

    expect(fn).toThrow(new UnprocessableContentError([
      {
        path: 'headers',
        message: 'must be object',
      },
    ]))
  })

  test('when the "headers" field is invalid (array)', () => {
    const fn = () => validateRequest({
      ...MESSAGE_VALID,
      headers: [],
    })

    expect(fn).toThrow(new UnprocessableContentError([
      {
        path: 'headers',
        message: 'must be object',
      },
    ]))
  })

  test('when the "query" field is missing', () => {
    const fn = () => validateRequest({
      ...MESSAGE_VALID,
      query: undefined,
    })

    expect(fn).toThrow(new UnprocessableContentError([
      {
        path: '',
        message: `must have required property 'query'`,
      },
    ]))
  })

  test('when the "query" field is invalid (null)', () => {
    const fn = () => validateRequest({
      ...MESSAGE_VALID,
      query: null,
    })

    expect(fn).toThrow(new UnprocessableContentError([
      {
        path: 'query',
        message: 'must be object',
      },
    ]))
  })

  test('when the "body" field is missing', () => {
    const fn = () => validateRequest({
      ...MESSAGE_VALID,
      body: undefined,
    })

    expect(fn).toThrow(new UnprocessableContentError([
      {
        path: '',
        message: `must have required property 'body'`,
      },
    ]))
  })

  test('when the "body" field is invalid (null)', () => {
    const fn = () => validateRequest({
      ...MESSAGE_VALID,
      body: null,
    })

    expect(fn).not.toThrow()
  })

  test('when the "body" field is invalid (object)', () => {
    const fn = () => validateRequest({
      ...MESSAGE_VALID,
      body: {
        a: 1,
      },
    })

    expect(fn).not.toThrow()
  })

  test('when the "body" field is invalid (array)', () => {
    const fn = () => validateRequest({
      ...MESSAGE_VALID,
      body: [],
    })

    expect(fn).not.toThrow()
  })

  test('when a valid request is provided', () => {
    const fn = () => validateRequest(MESSAGE_VALID)

    expect(fn).not.toThrow()
  })

  test.each([
    'HEAD',
    'GET',
    'PUT',
    'POST',
    'PATCH',
    'DELETE',
  ])('when "method" is "%s"', (method) => {
    const fn = () => validateRequest({
      ...MESSAGE_VALID,
      method,
    })

    expect(fn).not.toThrow()
  })

  test('when unknown properties are provided (stripped, still valid)', () => {
    const message = {
      ...MESSAGE_VALID,
      extra: 'nope',
    }

    expect(() => validateRequest(message)).not.toThrow()
    expect(message).not.toHaveProperty('extra')
  })
})
