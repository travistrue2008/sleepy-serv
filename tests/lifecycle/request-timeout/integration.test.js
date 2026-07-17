import { test, expect } from 'bun:test'
import { createApp } from 'sleepy-serv'
import SleepySocketClient from 'sleepy-socket'

test('when the server never replies', async () => {
  const app = await createApp(0, import.meta.dirname)
  const host = app.server.url.hostname

  const client = await SleepySocketClient.connect(host, app.server.port, {
    timeout: 100,
  })

  const promise = client.send({
    method: 'GET',
    route: '/hang',
  })

  await expect(promise).rejects.toThrow(new Error('Request timed out.'))

  await client.close()
  await app.server.stop(true)
})
