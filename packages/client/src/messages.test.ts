import { describe, test, expect } from 'bun:test'
import { MessageType, createMessage } from './messages'

const ID = '11111111-1111-4111-8111-111111111111'
const CLIENT_ID = '22222222-2222-4222-8222-222222222222'
const STATUS = 200
const METHOD = 'GET'
const TIMESTAMP = '2000-01-01T00:00:00.000Z'
const HEADERS = new Headers({ a: '1' })

describe('createMessage()', () => {
  test('when NO "opts" are provided', () => {
    const res = createMessage(CLIENT_ID, MessageType.Response)

    expect(res).toStrictEqual({
      id: res.id,
      clientId: CLIENT_ID,
      type: MessageType.Response,
      timestamp: TIMESTAMP,
      headers: new Headers(),
      body: null,
    })
  })

  test('when "opts.id" is provided', () => {
    const res = createMessage(CLIENT_ID, MessageType.Response, { id: ID })

    expect(res).toStrictEqual({
      id: ID,
      clientId: CLIENT_ID,
      type: MessageType.Response,
      timestamp: TIMESTAMP,
      headers: new Headers(),
      body: null,
    })
  })

  test('when "opts.headers" is provided', () => {
    const res = createMessage(CLIENT_ID, MessageType.Response, {
      headers: HEADERS,
    })

    expect(res).toStrictEqual({
      id: res.id,
      clientId: CLIENT_ID,
      type: MessageType.Response,
      timestamp: TIMESTAMP,
      headers: HEADERS,
      body: null,
    })
  })

  test('when "opts.body" is provided', () => {
    const BODY = { a: 1 }

    const res = createMessage(CLIENT_ID, MessageType.Response, {
      body: BODY,
    })

    expect(res).toStrictEqual({
      id: res.id,
      clientId: CLIENT_ID,
      type: MessageType.Response,
      timestamp: TIMESTAMP,
      headers: new Headers(),
      body: BODY,
    })
  })

  test('when extra "opts" are provided', () => {
    const res = createMessage(CLIENT_ID, MessageType.Response, {
      method: METHOD,
      status: STATUS,
    })

    expect(res).toStrictEqual({
      id: res.id,
      clientId: CLIENT_ID,
      type: MessageType.Response,
      timestamp: TIMESTAMP,
      method: METHOD,
      status: STATUS,
      headers: new Headers(),
      body: null,
    })
  })
})
