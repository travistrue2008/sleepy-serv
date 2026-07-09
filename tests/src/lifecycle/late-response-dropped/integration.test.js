import { jest, describe, test, expect } from 'bun:test'
import { boot } from '../../helpers'

describe('send()', () => {
  test('when a reply arrives for an already-timed-out request', async () => {
    /*
      Real timers: the client's 100ms timeout must fire before the server's
      250ms reply, so the reply lands with no matching pending request
     */

    jest.useRealTimers()

    const { client, shutdown } = await boot(import.meta.dirname, {
      client: {
        timeout: 0.1,
      },
    })

    const fn = () => client.send({
      method: 'GET',
      route: '/slow-reply',
    })

    await expect(fn()).rejects.toThrow('Request timed out.')

    await Bun.sleep(300)

    const res = await client.send({
      method: 'GET',
      route: '/ok',
    })

    expect(res.status).toBe(200)
    expect(res.body).toStrictEqual({ ok: true })

    await shutdown()
  })
})
