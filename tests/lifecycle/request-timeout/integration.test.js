import { jest, describe, test, expect } from 'bun:test'
import { boot } from '../../_helpers'

test('when the server never replies', async () => {
  const { client, shutdown } = await boot(import.meta.dirname)

  const promise = client.send({
    method: 'GET',
    route: '/hang',
  })

  jest.advanceTimersByTime(30_000)

  await expect(promise).rejects.toThrow('Request timed out.')

  await shutdown()
})
