import * as uuid from 'uuid'
import { test, expect } from 'bun:test'
import { UnprocessableContentError } from '../../../src/errors'
import { TYPES } from '../../../src/messages'
import { Context } from '../../_helpers'

const ID = uuid.v4()
const METHOD = 'GET'
const ROUTE = '/'
const TIMESTAMP = '2000-01-01T00:00:00.000Z'

const MESSAGE_VALID = {
  id: ID,
  type: TYPES.REQUEST,
  method: METHOD,
  route: ROUTE,
  timestamp: TIMESTAMP,
  headers: {},
  query: {},
  body: null,
}

test('when received message "id" field is missing', async () => {
  const ctx = await Context.create(import.meta.dirname)

  const res = await ctx.sendMessageRaw({
    ...MESSAGE_VALID,
    id: undefined,
  })

  await ctx.shutdown()

  expect(res).toStrictEqual({
    id: res.id,
    type: TYPES.RESPONSE,
    status: UnprocessableContentError.status,
    timestamp: TIMESTAMP,
    headers: {},
    body: [
      {
        path: '',
        message: `must have required property 'id'`,
      },
    ],
  })
})

test('when received message "id" field is invalid', async () => {
  const ctx = await Context.create(import.meta.dirname)

  const res = await ctx.sendMessageRaw({
    ...MESSAGE_VALID,
    id: 'invalid',
  })

  await ctx.shutdown()

  expect(res).toStrictEqual({
    id: res.id,
    type: TYPES.RESPONSE,
    status: UnprocessableContentError.status,
    timestamp: TIMESTAMP,
    headers: {},
    body: [
      {
        path: 'id',
        message: `must match format "uuid"`,
      },
    ],
  })
})

test('when received message "type" field is missing', async () => {
  const ctx = await Context.create(import.meta.dirname)

  const res = await ctx.sendMessageRaw({
    ...MESSAGE_VALID,
    type: undefined,
  })

  await ctx.shutdown()

  expect(res).toStrictEqual({
    id: res.id,
    type: TYPES.RESPONSE,
    status: UnprocessableContentError.status,
    timestamp: TIMESTAMP,
    headers: {},
    body: [
      {
        path: '',
        message: `must have required property 'type'`,
      },
    ],
  })
})

test('when received message "type" is invalid', async () => {
  const ctx = await Context.create(import.meta.dirname)

  const res = await ctx.sendMessageRaw({
    ...MESSAGE_VALID,
    type: 'invalid',
  })

  await ctx.shutdown()

  expect(res).toStrictEqual({
    id: res.id,
    type: TYPES.RESPONSE,
    status: UnprocessableContentError.status,
    timestamp: TIMESTAMP,
    headers: {},
    body: [
      {
        path: 'type',
        message: 'must be equal to constant',
      },
    ],
  })
})

test('when received message "method" field is missing', async () => {
  const ctx = await Context.create(import.meta.dirname)

  const res = await ctx.sendMessageRaw({
    ...MESSAGE_VALID,
    method: undefined,
  })

  await ctx.shutdown()

  expect(res).toStrictEqual({
    id: res.id,
    type: TYPES.RESPONSE,
    status: UnprocessableContentError.status,
    timestamp: TIMESTAMP,
    headers: {},
    body: [
      {
        path: '',
        message: `must have required property 'method'`,
      },
    ],
  })
})

test('when received message "method" is invalid', async () => {
  const ctx = await Context.create(import.meta.dirname)

  const res = await ctx.sendMessageRaw({
    ...MESSAGE_VALID,
    method: 'invalid',
  })

  await ctx.shutdown()

  expect(res).toStrictEqual({
    id: res.id,
    type: TYPES.RESPONSE,
    status: UnprocessableContentError.status,
    timestamp: TIMESTAMP,
    headers: {},
    body: [
      {
        path: 'method',
        message: 'must be equal to one of the allowed values',
      },
    ],
  })
})

test('when received message "route" field is missing', async () => {
  const ctx = await Context.create(import.meta.dirname)

  const res = await ctx.sendMessageRaw({
    ...MESSAGE_VALID,
    route: undefined,
  })

  await ctx.shutdown()

  expect(res).toStrictEqual({
    id: res.id,
    type: TYPES.RESPONSE,
    status: UnprocessableContentError.status,
    timestamp: TIMESTAMP,
    headers: {},
    body: [
      {
        path: '',
        message: `must have required property 'route'`,
      },
    ],
  })
})

test('when received message "route" field is invalid', async () => {
  const ctx = await Context.create(import.meta.dirname)

  const res = await ctx.sendMessageRaw({
    ...MESSAGE_VALID,
    route: 'hello world',
  })

  await ctx.shutdown()

  expect(res).toStrictEqual({
    id: res.id,
    type: TYPES.RESPONSE,
    status: UnprocessableContentError.status,
    timestamp: TIMESTAMP,
    headers: {},
    body: [
      {
        path: 'route',
        message: `must match format "uri-reference"`,
      },
    ],
  })
})

test('when received message "timestamp" field is missing', async () => {
  const ctx = await Context.create(import.meta.dirname)

  const res = await ctx.sendMessageRaw({
    ...MESSAGE_VALID,
    timestamp: undefined,
  })

  await ctx.shutdown()

  expect(res).toStrictEqual({
    id: res.id,
    type: TYPES.RESPONSE,
    status: UnprocessableContentError.status,
    timestamp: TIMESTAMP,
    headers: {},
    body: [
      {
        path: '',
        message: `must have required property 'timestamp'`,
      },
    ],
  })
})

test('when received message "timestamp" field is invalid', async () => {
  const ctx = await Context.create(import.meta.dirname)

  const res = await ctx.sendMessageRaw({
    ...MESSAGE_VALID,
    timestamp: '2000-01-01',
  })

  await ctx.shutdown()

  expect(res).toStrictEqual({
    id: res.id,
    type: TYPES.RESPONSE,
    status: UnprocessableContentError.status,
    timestamp: TIMESTAMP,
    headers: {},
    body: [
      {
        path: 'timestamp',
        message: `must match format "date-time"`,
      },
    ],
  })
})

test('when received message "headers" field is missing', async () => {
  const ctx = await Context.create(import.meta.dirname)

  const res = await ctx.sendMessageRaw({
    ...MESSAGE_VALID,
    headers: undefined,
  })

  await ctx.shutdown()

  expect(res).toStrictEqual({
    id: res.id,
    type: TYPES.RESPONSE,
    status: UnprocessableContentError.status,
    timestamp: TIMESTAMP,
    headers: {},
    body: [
      {
        path: '',
        message: `must have required property 'headers'`,
      },
    ],
  })
})

test('when received message "headers" field is invalid (null)', async () => {
  const ctx = await Context.create(import.meta.dirname)

  const res = await ctx.sendMessageRaw({
    ...MESSAGE_VALID,
    headers: null,
  })

  await ctx.shutdown()

  expect(res).toStrictEqual({
    id: res.id,
    type: TYPES.RESPONSE,
    status: UnprocessableContentError.status,
    timestamp: TIMESTAMP,
    headers: {},
    body: [
      {
        path: 'headers',
        message: 'must be object',
      },
    ],
  })
})

test('when received message "headers" field is invalid (array)', async () => {
  const ctx = await Context.create(import.meta.dirname)

  const res = await ctx.sendMessageRaw({
    ...MESSAGE_VALID,
    headers: [],
  })

  await ctx.shutdown()

  expect(res).toStrictEqual({
    id: res.id,
    type: TYPES.RESPONSE,
    status: UnprocessableContentError.status,
    timestamp: TIMESTAMP,
    headers: {},
    body: [
      {
        path: 'headers',
        message: 'must be object',
      },
    ],
  })
})

test('when received message "query" field is missing', async () => {
  const ctx = await Context.create(import.meta.dirname)

  const res = await ctx.sendMessageRaw({
    ...MESSAGE_VALID,
    query: undefined,
  })

  await ctx.shutdown()

  expect(res).toStrictEqual({
    id: res.id,
    type: TYPES.RESPONSE,
    status: UnprocessableContentError.status,
    timestamp: TIMESTAMP,
    headers: {},
    body: [
      {
        path: '',
        message: `must have required property 'query'`,
      },
    ],
  })
})

test('when received message "body" field is missing', async () => {
  const ctx = await Context.create(import.meta.dirname)

  const res = await ctx.sendMessageRaw({
    ...MESSAGE_VALID,
    body: undefined,
  })

  await ctx.shutdown()

  expect(res).toStrictEqual({
    id: res.id,
    type: TYPES.RESPONSE,
    status: UnprocessableContentError.status,
    timestamp: TIMESTAMP,
    headers: {},
    body: [
      {
        path: '',
        message: `must have required property 'body'`,
      },
    ],
  })
})
