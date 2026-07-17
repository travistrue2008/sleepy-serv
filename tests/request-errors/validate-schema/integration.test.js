import { test, expect } from 'bun:test'
import { createApp, UnprocessableContentError } from 'sleepy-serv'
import SleepySocketClient, { TYPES } from 'sleepy-socket'

test('when app-level validateSchema middleware rejects a request', async () => {
  const app = await createApp(0, import.meta.dirname)
  const host = app.server.url.hostname
  const client = await SleepySocketClient.connect(host, app.server.port)

  const res = await client.send({
    method: 'GET',
    route: '/items',
    query: { term: 'no' },
  })

  await client.close()
  await app.server.stop(true)

  expect(res).toStrictEqual({
    id: res.id,
    clientId: client.clientId,
    type: TYPES.RESPONSE,
    timestamp: res.timestamp,
    status: UnprocessableContentError.status,
    headers: {
      'content-type': 'application/json;charset=utf-8',
    },
    body: [
      {
        path: 'query.term',
        message: 'must NOT have fewer than 3 characters',
      },
    ],
  })
})

test('when the request satisfies the schema', async () => {
  const app = await createApp(0, import.meta.dirname)
  const host = app.server.url.hostname
  const client = await SleepySocketClient.connect(host, app.server.port)

  const res = await client.send({
    method: 'GET',
    route: '/items',
    query: { term: 'yes' },
  })

  await client.close()
  await app.server.stop(true)

  expect(res).toStrictEqual({
    id: res.id,
    clientId: client.clientId,
    type: TYPES.RESPONSE,
    timestamp: res.timestamp,
    status: 200,
    headers: {
      'content-type': 'application/json;charset=utf-8',
    },
    body: {
      term: 'yes',
    },
  })
})
