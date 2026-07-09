import { test, expect } from 'bun:test'
import { UnprocessableContentError } from 'sleepy-serv'
import { TYPES } from 'sleepy-socket'
import { boot } from '../../_helpers'

test('when app-level validateSchema middleware rejects the request', async () => {
  const { client, shutdown } = await boot(import.meta.dirname)

  const res = await client.send({
    method: 'GET',
    route: '/items',
    query: { term: 'no' },
  })

  await shutdown()

  expect(res.type).toBe(TYPES.RESPONSE)
  expect(res.status).toBe(UnprocessableContentError.status)
  expect(res.body).toBeTruthy()
})

test('when the request satisfies the schema', async () => {
  const { client, shutdown } = await boot(import.meta.dirname)

  const res = await client.send({
    method: 'GET',
    route: '/items',
    query: { term: 'yes' },
  })

  await shutdown()

  expect(res.status).toBe(200)
  expect(res.body).toStrictEqual({ term: 'yes' })
})
