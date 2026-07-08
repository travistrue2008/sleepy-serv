import { test, expect } from 'bun:test'

import {
  TYPES,
  createBaseMessage,
  createRequestMessage,
} from './messages'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

test('when creating a base message', () => {
  const message = createBaseMessage()

  expect(message.id).toMatch(UUID_REGEX)
  expect(new Date(message.timestamp).toISOString()).toBe(message.timestamp)
  expect(message.headers).toEqual({})
  expect(message.body).toBeNull()
})

test('when creating base messages, each gets a unique id', () => {
  const a = createBaseMessage()
  const b = createBaseMessage()

  expect(a.id).not.toBe(b.id)
})

test('when creating a request message', () => {
  const message = createRequestMessage({
    method: 'POST',
    route: '/game',
    query: { round: '3' },
    headers: { authorization: 'token' },
    body: { name: 'trivia' },
  })

  expect(message.type).toBe(TYPES.REQUEST)
  expect(message.type).toBe('request')
  expect(message.id).toMatch(UUID_REGEX)
  expect(new Date(message.timestamp).toISOString()).toBe(message.timestamp)
  expect(message.method).toBe('POST')
  expect(message.route).toBe('/game')
  expect(message.query).toEqual({ round: '3' })
  expect(message.headers).toEqual({ authorization: 'token' })
  expect(message.body).toEqual({ name: 'trivia' })
})

test('when creating a request message without a query, it defaults to a non-null object', () => {
  const message = createRequestMessage({
    method: 'GET',
    route: '/users',
  })

  expect(message.query).toEqual({})
  expect(message.query).not.toBeNull()
})

test('when creating a request message without a body, it defaults to null', () => {
  const message = createRequestMessage({
    method: 'GET',
    route: '/users',
  })

  expect(message.body).toBeNull()
})

test('when creating a request message without headers, it defaults to an empty object', () => {
  const message = createRequestMessage({
    method: 'GET',
    route: '/users',
  })

  expect(message.headers).toEqual({})
})
