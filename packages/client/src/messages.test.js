import * as uuid from 'uuid'
import { describe, test, expect } from 'bun:test'
import { TYPES, createMessage } from './messages'

const ID = uuid.v4()
const STATUS = 200
const METHOD = 'GET'
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
