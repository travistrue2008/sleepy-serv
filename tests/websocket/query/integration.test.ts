import SleepySocketClient from 'sleepy-socket'
import { test, expect } from 'bun:test'
import { StatusCode, createApp } from 'sleepy-serv'
import { Fmt, createRequestor } from '../../helpers'

test('when querying all active sessions', async () => {
  const app = await createApp(0, import.meta.dirname)
  const host = app.server.url.hostname
  const port = app.server.port!
  const req = createRequestor(app)

  const clientA = await SleepySocketClient.open(host, port)
  const clientB = await SleepySocketClient.open(host, port)

  const res = await req.get('/lobby', Fmt.Json)

  await clientA.close()
  await clientB.close()
  await app.close(true)

  expect(res.status).toBe(StatusCode.Ok)

  expect(res.body).toStrictEqual([
    {
      clientId: clientA.id!,
      app: null,
    },
    {
      clientId: clientB.id!,
      app: null,
    },
  ])
})
