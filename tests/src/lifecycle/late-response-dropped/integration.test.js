import { test, expect } from 'bun:test'
import { boot } from '../../helpers'

test('when a reply arrives for an already-timed-out request', async () => {
  /*
    Real timers: the client's 100ms timeout must fire before the server's
    250ms reply, so the reply lands with no matching pending request
    */

  const { client, shutdown } = await boot(import.meta.dirname, {
    client: {
      timeout: 100,
    },
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

  await shutdown()

  expect(res.status).toBe(200)
  expect(res.body).toStrictEqual({ ok: true })
})
