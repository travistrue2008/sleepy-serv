import { test, expect } from 'bun:test'
import { boot } from '../../helpers'

test('when the server never replies', async () => {
  const { client, shutdown } = await boot(import.meta.dirname, {
    client: {
      timeout: 100,
    },
  })

  const promise = client.send({
    method: 'GET',
    route: '/hang',
  })

  await expect(promise).rejects.toThrow(new Error('Request timed out.'))

  await shutdown()
})
