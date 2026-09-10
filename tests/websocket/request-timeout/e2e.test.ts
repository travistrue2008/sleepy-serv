import SleepySocketClient from 'sleepy-socket'
import { test, expect } from 'bun:test'
import { createServer } from '../../helpers'

test('when the server never replies', async () => {
  const server = await createServer(import.meta.dirname)

  const client = await SleepySocketClient.open(
    'localhost',
    server.port,
    { timeout: 100 },
  )

  const promise = client.get('/hang')

  await expect(promise).rejects.toThrow(new Error('Request timed out.'))

  await client.close()
  await server.kill()
})
