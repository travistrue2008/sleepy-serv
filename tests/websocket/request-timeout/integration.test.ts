import SleepySocketClient from 'sleepy-socket'
import { createApp } from 'sleepy-serv'
import { test, expect } from 'bun:test'

test('when the server never replies', async () => {
  const app = createApp(0)
  const host = app.server.url.hostname
  const port = app.server.port!

  const client = await SleepySocketClient.open(host, port, {
    timeout: 100,
  })

  const promise = client.get('/hang')

  await expect(promise).rejects.toThrow(new Error('Request timed out.'))

  await client.close()
  await app.close(true)
})
