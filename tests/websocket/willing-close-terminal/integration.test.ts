import { test, expect } from 'bun:test'
import { Fmt, createRequestor } from '../../helpers'
import { StatusCode, createApp } from 'sleepy-serv'
import SleepySocketClient from 'sleepy-socket'

test('when a willingly-closed clientId is reclaimed', async () => {
  const app = await createApp(0, import.meta.dirname)
  const host = app.server.url.hostname
  const port = app.server.port!
  const client = await SleepySocketClient.connect(host, port)
  const req = createRequestor(app)

  await client.close()

  const res = await req.put(`/ws/${client.id}`, Fmt.Json, {
    headers: new Headers({
      authorization: `Bearer ${client.token}`,
    }),
  })

  await app.close(true)

  expect(res.status).toBe(StatusCode.NotFound)
  expect(res.body).toBe(null)
})
