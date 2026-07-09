import { test, expect } from 'bun:test'
import { boot } from '../../helpers'

test('when several concurrent requests hit the same route', async () => {
  const { client, shutdown } = await boot(import.meta.dirname)

  const [a, b, c] = await Promise.all([
    client.send({
      method: 'GET',
      route: '/echo',
      query: { n: '1' },
    }),
    client.send({
      method: 'GET',
      route: '/echo',
      query: { n: '2' },
    }),
    client.send({
      method: 'GET',
      route: '/echo',
      query: { n: '3' },
    }),
  ])

  await shutdown()

  expect(a.body).toStrictEqual({ n: '1' })
  expect(b.body).toStrictEqual({ n: '2' })
  expect(c.body).toStrictEqual({ n: '3' })
})
