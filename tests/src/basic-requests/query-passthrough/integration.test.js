import { test, expect } from 'bun:test'
import { TYPES } from 'sleepy-socket'
import { boot } from '../../helpers'

test('when a request carries a query object', async () => {
  const { client, shutdown } = await boot(import.meta.dirname)

  const res = await client.send({
    method: 'GET',
    route: '/search',
    query: {
      page: '2',
      term: 'hello',
    },
  })

  await shutdown()

  expect(res).toStrictEqual({
    id: res.id,
    type: TYPES.RESPONSE,
    status: 200,
    timestamp: res.timestamp,
    headers: {
      'content-type': 'application/json;charset=utf-8',
    },
    body: {
      query: {
        page: '2',
        term: 'hello',
      },
    },
  })
})
