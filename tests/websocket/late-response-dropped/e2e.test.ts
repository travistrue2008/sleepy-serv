import SleepySocketClient from 'sleepy-socket'
import { test, expect } from 'bun:test'
import { createServer } from '../../helpers'

test('when a reply arrives for an already-timed-out request', async () => {
  /*
    Real timers: the client's 100ms timeout must fire before the server's
    250ms reply, so the reply lands with no matching pending request
    */

  const server = await createServer(import.meta.dirname)

  const client = await SleepySocketClient.open(
    'localhost',
    server.port,
    { timeout: 100 },
  )

  const promise = client.get('/slow-reply')

  await expect(promise).rejects.toThrow(new Error('Request timed out.'))

  await Bun.sleep(300)

  const result = await client.get('/ok')

  await client.close()
  await server.kill()

  expect(result.status).toBe(200)
  expect(result.body).toStrictEqual({ ok: true })
})
