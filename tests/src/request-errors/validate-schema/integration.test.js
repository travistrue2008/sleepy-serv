import { test, expect } from 'bun:test'
import { UnprocessableContentError } from 'sleepy-serv'
import { TYPES } from 'sleepy-socket'
import { boot } from '../../helpers'

test('when app-level validateSchema middleware rejects a request', async () => {
  const { client, shutdown } = await boot(import.meta.dirname)

  const res = await client.send({
    method: 'GET',
    route: '/items',
    query: { term: 'no' },
  })

  await shutdown()

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
  const { client, shutdown } = await boot(import.meta.dirname)

  const res = await client.send({
    method: 'GET',
    route: '/items',
    query: { term: 'yes' },
  })

  await shutdown()

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
