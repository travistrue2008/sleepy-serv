import { test, expect } from 'bun:test'
import { TYPES } from 'sleepy-socket'
import { boot } from '../../_helpers'

test('when the request envelope fails schema validation', async () => {
  const { client, shutdown } = await boot(import.meta.dirname)
  const res = await client.send({ route: '/' })

  await shutdown()

  expect(res.type).toBe(TYPES.RESPONSE)
  expect(res.status).toBe(422)
  expect(res.body).toBeTruthy()
})
