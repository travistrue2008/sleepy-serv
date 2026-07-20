import { test, expect } from 'bun:test'
import { createApp } from 'sleepy-serv'
import SleepySocketClient from 'sleepy-socket'

test('when a reply arrives for an already-timed-out request', async () => {
  /*
    Real timers: the client's 100ms timeout must fire before the server's
    250ms reply, so the reply lands with no matching pending request
    */

  const app = await createApp(0, import.meta.dirname)
  const host = app.server.url.hostname

  const client = await SleepySocketClient.connect(host, app.server.port, {
    timeout: 100,
  })

  const promise = client.send({
    method: 'GET',
    route: '/slow-reply',
  })

  await expect(promise).rejects.toThrow(new Error('Request timed out.'))

  await Bun.sleep(300)

  const res = await client.send({
    method: 'GET',
    route: '/ok',
  })

  await client.close()
  await app.server.stop(true)

  expect(res.status).toBe(200)
  expect(res.body).toStrictEqual({ ok: true })
})
