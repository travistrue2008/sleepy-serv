import crypto from 'node:crypto'
import { describe, test, expect } from 'bun:test'
import { createApp } from '../../../../src'
import { TYPES, TYPES_RECEIVED } from '../../../../src/messages'
import { UnprocessableContentError } from '../../../../src/errors'
import { createSocketClient } from '../../../helpers'

const ID = crypto.randomUUID()
const CLIENT_ID = crypto.randomUUID()
const METHOD = 'GET'
const ROUTE = '/'
const TIMESTAMP = '2000-01-01T00:00:00.000Z'

describe(`when "type" = "${TYPES.HEARTBEAT}"`, () => {
  const MESSAGE_VALID = {
    id: ID,
    clientId: CLIENT_ID,
    type: TYPES.HEARTBEAT,
    timestamp: TIMESTAMP,
  }

  test('when received message "id" field is missing', async () => {
    const app = await createApp(0, import.meta.dirname)
    const ws = await createSocketClient(app)

    const msg = await ws.sendRaw({
      ...MESSAGE_VALID,
      id: undefined,
    })

    await app.server.stop(true)

    expect(msg).toStrictEqual({
      id: msg.id,
      clientId: CLIENT_ID,
      type: TYPES.RESPONSE,
      status: UnprocessableContentError.status,
      timestamp: TIMESTAMP,
      headers: {
        'content-type': 'application/json;charset=utf-8',
      },
      body: [
        {
          path: '',
          message: `must have required property 'id'`,
        },
      ],
    })
  })

  test('when received message "id" field is invalid', async () => {
    const app = await createApp(0, import.meta.dirname)
    const ws = await createSocketClient(app)

    const msg = await ws.sendRaw({
      ...MESSAGE_VALID,
      id: 'invalid',
    })

    await app.server.stop(true)

    expect(msg).toStrictEqual({
      id: msg.id,
      clientId: CLIENT_ID,
      type: TYPES.RESPONSE,
      status: UnprocessableContentError.status,
      timestamp: TIMESTAMP,
      headers: {
        'content-type': 'application/json;charset=utf-8',
      },
      body: [
        {
          path: 'id',
          message: `must match format "uuid"`,
        },
      ],
    })
  })

  test('when received message "clientId" field is missing', async () => {
    const app = await createApp(0, import.meta.dirname)
    const ws = await createSocketClient(app)

    const msg = await ws.sendRaw({
      ...MESSAGE_VALID,
      clientId: undefined,
    })

    await app.server.stop(true)

    expect(msg).toStrictEqual({
      id: msg.id,
      type: TYPES.RESPONSE,
      status: UnprocessableContentError.status,
      timestamp: TIMESTAMP,
      headers: {
        'content-type': 'application/json;charset=utf-8',
      },
      body: [
        {
          path: '',
          message: `must have required property 'clientId'`,
        },
      ],
    })
  })

  test('when received message "clientId" field is invalid', async () => {
    const app = await createApp(0, import.meta.dirname)
    const ws = await createSocketClient(app)

    const msg = await ws.sendRaw({
      ...MESSAGE_VALID,
      clientId: 'invalid',
    })

    await app.server.stop(true)

    expect(msg).toStrictEqual({
      id: msg.id,
      clientId: msg.clientId,
      type: TYPES.RESPONSE,
      status: UnprocessableContentError.status,
      timestamp: TIMESTAMP,
      headers: {
        'content-type': 'application/json;charset=utf-8',
      },
      body: [
        {
          path: 'clientId',
          message: `must match format "uuid"`,
        },
      ],
    })
  })

  test('when received message "type" field is missing', async () => {
    const app = await createApp(0, import.meta.dirname)
    const ws = await createSocketClient(app)

    const msg = await ws.sendRaw({
      ...MESSAGE_VALID,
      type: undefined,
    })

    await app.server.stop(true)

    expect(msg).toStrictEqual({
      id: msg.id,
      clientId: CLIENT_ID,
      type: TYPES.RESPONSE,
      status: UnprocessableContentError.status,
      timestamp: TIMESTAMP,
      headers: {
        'content-type': 'application/json;charset=utf-8',
      },
      body: [
        {
          path: '',
          message: `must have required property 'type'`,
        },
      ],
    })
  })

  test('when received message "type" is invalid', async () => {
    const app = await createApp(0, import.meta.dirname)
    const ws = await createSocketClient(app)

    const msg = await ws.sendRaw({
      ...MESSAGE_VALID,
      type: 'invalid',
    })

    await app.server.stop(true)

    expect(msg).toStrictEqual({
      id: msg.id,
      clientId: CLIENT_ID,
      type: TYPES.RESPONSE,
      status: UnprocessableContentError.status,
      timestamp: TIMESTAMP,
      headers: {
        'content-type': 'application/json;charset=utf-8',
      },
      body: [
        {
          path: 'type',
          message: `must be one of: ${TYPES_RECEIVED}`,
        },
      ],
    })
  })

  test('when received message "timestamp" field is missing', async () => {
    const app = await createApp(0, import.meta.dirname)
    const ws = await createSocketClient(app)

    const msg = await ws.sendRaw({
      ...MESSAGE_VALID,
      timestamp: undefined,
    })

    await app.server.stop(true)

    expect(msg).toStrictEqual({
      id: msg.id,
      clientId: CLIENT_ID,
      type: TYPES.RESPONSE,
      status: UnprocessableContentError.status,
      timestamp: TIMESTAMP,
      headers: {
        'content-type': 'application/json;charset=utf-8',
      },
      body: [
        {
          path: '',
          message: `must have required property 'timestamp'`,
        },
      ],
    })
  })

  test('when received message "timestamp" field is invalid', async () => {
    const app = await createApp(0, import.meta.dirname)
    const ws = await createSocketClient(app)

    const msg = await ws.sendRaw({
      ...MESSAGE_VALID,
      timestamp: '2000-01-01',
    })

    await app.server.stop(true)

    expect(msg).toStrictEqual({
      id: msg.id,
      clientId: CLIENT_ID,
      type: TYPES.RESPONSE,
      status: UnprocessableContentError.status,
      timestamp: TIMESTAMP,
      headers: {
        'content-type': 'application/json;charset=utf-8',
      },
      body: [
        {
          path: 'timestamp',
          message: `must match format "date-time"`,
        },
      ],
    })
  })
})

describe(`when "type" = "${TYPES.REQUEST}"`, () => {
  const MESSAGE_VALID = {
    id: ID,
    clientId: CLIENT_ID,
    type: TYPES.REQUEST,
    method: METHOD,
    route: ROUTE,
    timestamp: TIMESTAMP,
    headers: {},
    query: {},
    body: null,
  }

  test('when received message "id" field is missing', async () => {
    const app = await createApp(0, import.meta.dirname)
    const ws = await createSocketClient(app)

    const msg = await ws.sendRaw({
      ...MESSAGE_VALID,
      id: undefined,
    })

    await app.server.stop(true)

    expect(msg).toStrictEqual({
      id: msg.id,
      clientId: CLIENT_ID,
      type: TYPES.RESPONSE,
      status: UnprocessableContentError.status,
      timestamp: TIMESTAMP,
      headers: {
        'content-type': 'application/json;charset=utf-8',
      },
      body: [
        {
          path: '',
          message: `must have required property 'id'`,
        },
      ],
    })
  })

  test('when received message "id" field is invalid', async () => {
    const app = await createApp(0, import.meta.dirname)
    const ws = await createSocketClient(app)

    const msg = await ws.sendRaw({
      ...MESSAGE_VALID,
      id: 'invalid',
    })

    await app.server.stop(true)

    expect(msg).toStrictEqual({
      id: msg.id,
      clientId: CLIENT_ID,
      type: TYPES.RESPONSE,
      status: UnprocessableContentError.status,
      timestamp: TIMESTAMP,
      headers: {
        'content-type': 'application/json;charset=utf-8',
      },
      body: [
        {
          path: 'id',
          message: `must match format "uuid"`,
        },
      ],
    })
  })

  test('when received message "clientId" field is missing', async () => {
    const app = await createApp(0, import.meta.dirname)
    const ws = await createSocketClient(app)

    const msg = await ws.sendRaw({
      ...MESSAGE_VALID,
      clientId: undefined,
    })

    await app.server.stop(true)

    expect(msg).toStrictEqual({
      id: msg.id,
      type: TYPES.RESPONSE,
      status: UnprocessableContentError.status,
      timestamp: TIMESTAMP,
      headers: {
        'content-type': 'application/json;charset=utf-8',
      },
      body: [
        {
          path: '',
          message: `must have required property 'clientId'`,
        },
      ],
    })
  })

  test('when received message "clientId" field is invalid', async () => {
    const app = await createApp(0, import.meta.dirname)
    const ws = await createSocketClient(app)

    const msg = await ws.sendRaw({
      ...MESSAGE_VALID,
      clientId: 'invalid',
    })

    await app.server.stop(true)

    expect(msg).toStrictEqual({
      id: msg.id,
      clientId: msg.clientId,
      type: TYPES.RESPONSE,
      status: UnprocessableContentError.status,
      timestamp: TIMESTAMP,
      headers: {
        'content-type': 'application/json;charset=utf-8',
      },
      body: [
        {
          path: 'clientId',
          message: `must match format "uuid"`,
        },
      ],
    })
  })

  test('when received message "type" field is missing', async () => {
    const app = await createApp(0, import.meta.dirname)
    const ws = await createSocketClient(app)

    const msg = await ws.sendRaw({
      ...MESSAGE_VALID,
      type: undefined,
    })

    await app.server.stop(true)

    expect(msg).toStrictEqual({
      id: msg.id,
      clientId: CLIENT_ID,
      type: TYPES.RESPONSE,
      status: UnprocessableContentError.status,
      timestamp: TIMESTAMP,
      headers: {
        'content-type': 'application/json;charset=utf-8',
      },
      body: [
        {
          path: '',
          message: `must have required property 'type'`,
        },
      ],
    })
  })

  test('when received message "type" is invalid', async () => {
    const app = await createApp(0, import.meta.dirname)
    const ws = await createSocketClient(app)

    const msg = await ws.sendRaw({
      ...MESSAGE_VALID,
      type: 'invalid',
    })

    await app.server.stop(true)

    expect(msg).toStrictEqual({
      id: msg.id,
      clientId: CLIENT_ID,
      type: TYPES.RESPONSE,
      status: UnprocessableContentError.status,
      timestamp: TIMESTAMP,
      headers: {
        'content-type': 'application/json;charset=utf-8',
      },
      body: [
        {
          path: 'type',
          message: `must be one of: ${TYPES_RECEIVED}`,
        },
      ],
    })
  })

  test('when received message "method" field is missing', async () => {
    const app = await createApp(0, import.meta.dirname)
    const ws = await createSocketClient(app)

    const msg = await ws.sendRaw({
      ...MESSAGE_VALID,
      method: undefined,
    })

    await app.server.stop(true)

    expect(msg).toStrictEqual({
      id: msg.id,
      clientId: CLIENT_ID,
      type: TYPES.RESPONSE,
      status: UnprocessableContentError.status,
      timestamp: TIMESTAMP,
      headers: {
        'content-type': 'application/json;charset=utf-8',
      },
      body: [
        {
          path: '',
          message: `must have required property 'method'`,
        },
      ],
    })
  })

  test('when received message "method" is invalid', async () => {
    const app = await createApp(0, import.meta.dirname)
    const ws = await createSocketClient(app)

    const msg = await ws.sendRaw({
      ...MESSAGE_VALID,
      method: 'invalid',
    })

    await app.server.stop(true)

    expect(msg).toStrictEqual({
      id: msg.id,
      clientId: CLIENT_ID,
      type: TYPES.RESPONSE,
      status: UnprocessableContentError.status,
      timestamp: TIMESTAMP,
      headers: {
        'content-type': 'application/json;charset=utf-8',
      },
      body: [
        {
          path: 'method',
          message: 'must be equal to one of the allowed values',
        },
      ],
    })
  })

  test('when received message "route" field is missing', async () => {
    const app = await createApp(0, import.meta.dirname)
    const ws = await createSocketClient(app)

    const msg = await ws.sendRaw({
      ...MESSAGE_VALID,
      route: undefined,
    })

    await app.server.stop(true)

    expect(msg).toStrictEqual({
      id: msg.id,
      clientId: CLIENT_ID,
      type: TYPES.RESPONSE,
      status: UnprocessableContentError.status,
      timestamp: TIMESTAMP,
      headers: {
        'content-type': 'application/json;charset=utf-8',
      },
      body: [
        {
          path: '',
          message: `must have required property 'route'`,
        },
      ],
    })
  })

  test('when received message "route" field is invalid', async () => {
    const app = await createApp(0, import.meta.dirname)
    const ws = await createSocketClient(app)

    const msg = await ws.sendRaw({
      ...MESSAGE_VALID,
      route: 'hello world',
    })

    await app.server.stop(true)

    expect(msg).toStrictEqual({
      id: msg.id,
      clientId: CLIENT_ID,
      type: TYPES.RESPONSE,
      status: UnprocessableContentError.status,
      timestamp: TIMESTAMP,
      headers: {
        'content-type': 'application/json;charset=utf-8',
      },
      body: [
        {
          path: 'route',
          message: `must match format "uri-reference"`,
        },
      ],
    })
  })

  test('when received message "timestamp" field is missing', async () => {
    const app = await createApp(0, import.meta.dirname)
    const ws = await createSocketClient(app)

    const msg = await ws.sendRaw({
      ...MESSAGE_VALID,
      timestamp: undefined,
    })

    await app.server.stop(true)

    expect(msg).toStrictEqual({
      id: msg.id,
      clientId: CLIENT_ID,
      type: TYPES.RESPONSE,
      status: UnprocessableContentError.status,
      timestamp: TIMESTAMP,
      headers: {
        'content-type': 'application/json;charset=utf-8',
      },
      body: [
        {
          path: '',
          message: `must have required property 'timestamp'`,
        },
      ],
    })
  })

  test('when received message "timestamp" field is invalid', async () => {
    const app = await createApp(0, import.meta.dirname)
    const ws = await createSocketClient(app)

    const msg = await ws.sendRaw({
      ...MESSAGE_VALID,
      timestamp: '2000-01-01',
    })

    await app.server.stop(true)

    expect(msg).toStrictEqual({
      id: msg.id,
      clientId: CLIENT_ID,
      type: TYPES.RESPONSE,
      status: UnprocessableContentError.status,
      timestamp: TIMESTAMP,
      headers: {
        'content-type': 'application/json;charset=utf-8',
      },
      body: [
        {
          path: 'timestamp',
          message: `must match format "date-time"`,
        },
      ],
    })
  })

  test('when received message "headers" field is missing', async () => {
    const app = await createApp(0, import.meta.dirname)
    const ws = await createSocketClient(app)

    const msg = await ws.sendRaw({
      ...MESSAGE_VALID,
      headers: undefined,
    })

    await app.server.stop(true)

    expect(msg).toStrictEqual({
      id: msg.id,
      clientId: CLIENT_ID,
      type: TYPES.RESPONSE,
      status: UnprocessableContentError.status,
      timestamp: TIMESTAMP,
      headers: {
        'content-type': 'application/json;charset=utf-8',
      },
      body: [
        {
          path: '',
          message: `must have required property 'headers'`,
        },
      ],
    })
  })

  test('when received message "headers" field is invalid (null)', async () => {
    const app = await createApp(0, import.meta.dirname)
    const ws = await createSocketClient(app)

    const msg = await ws.sendRaw({
      ...MESSAGE_VALID,
      headers: null,
    })

    await app.server.stop(true)

    expect(msg).toStrictEqual({
      id: msg.id,
      clientId: CLIENT_ID,
      type: TYPES.RESPONSE,
      status: UnprocessableContentError.status,
      timestamp: TIMESTAMP,
      headers: {
        'content-type': 'application/json;charset=utf-8',
      },
      body: [
        {
          path: 'headers',
          message: 'must be object',
        },
      ],
    })
  })

  test('when received message "headers" field is invalid (array)', async () => {
    const app = await createApp(0, import.meta.dirname)
    const ws = await createSocketClient(app)

    const msg = await ws.sendRaw({
      ...MESSAGE_VALID,
      headers: [],
    })

    await app.server.stop(true)

    expect(msg).toStrictEqual({
      id: msg.id,
      clientId: CLIENT_ID,
      type: TYPES.RESPONSE,
      status: UnprocessableContentError.status,
      timestamp: TIMESTAMP,
      headers: {
        'content-type': 'application/json;charset=utf-8',
      },
      body: [
        {
          path: 'headers',
          message: 'must be object',
        },
      ],
    })
  })

  test('when received message "query" field is missing', async () => {
    const app = await createApp(0, import.meta.dirname)
    const ws = await createSocketClient(app)

    const msg = await ws.sendRaw({
      ...MESSAGE_VALID,
      query: undefined,
    })

    await app.server.stop(true)

    expect(msg).toStrictEqual({
      id: msg.id,
      clientId: CLIENT_ID,
      type: TYPES.RESPONSE,
      status: UnprocessableContentError.status,
      timestamp: TIMESTAMP,
      headers: {
        'content-type': 'application/json;charset=utf-8',
      },
      body: [
        {
          path: '',
          message: `must have required property 'query'`,
        },
      ],
    })
  })

  test('when received message "body" field is missing', async () => {
    const app = await createApp(0, import.meta.dirname)
    const ws = await createSocketClient(app)

    const msg = await ws.sendRaw({
      ...MESSAGE_VALID,
      body: undefined,
    })

    await app.server.stop(true)

    expect(msg).toStrictEqual({
      id: msg.id,
      clientId: CLIENT_ID,
      type: TYPES.RESPONSE,
      status: UnprocessableContentError.status,
      timestamp: TIMESTAMP,
      headers: {
        'content-type': 'application/json;charset=utf-8',
      },
      body: [
        {
          path: '',
          message: `must have required property 'body'`,
        },
      ],
    })
  })
})
