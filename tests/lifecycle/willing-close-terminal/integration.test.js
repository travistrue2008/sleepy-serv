import { test, expect } from 'bun:test'
import { FMT, createRequestor } from '../../helpers'
import { NotFoundError, createApp } from 'sleepy-serv'
import SleepySocketClient from 'sleepy-socket'

test('when a willingly-closed clientId is reclaimed', async () => {
  const app = await createApp(0, import.meta.dirname)
  const host = app.server.url.hostname
  const client = await SleepySocketClient.connect(host, app.server.port)
  const req = createRequestor(app)

  await client.close()

  const res = await req.put(`/ws/${client.id}`, FMT.JSON, {
    headers: new Headers({
      authorization: `Bearer ${client.token}`,
    }),
  })

  await app.server.stop(true)

  expect(res.status).toBe(NotFoundError.status)
  expect(res.body).toBe(null)
})
