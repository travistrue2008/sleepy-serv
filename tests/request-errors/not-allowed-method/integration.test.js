import { test, expect } from 'bun:test'
import { createApp, MethodNotAllowedError } from 'sleepy-serv'
import SleepySocketClient, { TYPES } from 'sleepy-socket'

test('when the route exists but the method is not allowed', async () => {
  const app = await createApp(0, import.meta.dirname)
  const host = app.server.url.hostname
  const client = await SleepySocketClient.connect(host, app.server.port)

  const res = await client.send({
    method: 'POST',
    route: '/',
  })

  await client.close()
  await app.server.stop(true)

  expect(res).toStrictEqual({
    id: res.id,
    clientId: client.id,
    type: TYPES.RESPONSE,
    status: MethodNotAllowedError.status,
    timestamp: res.timestamp,
    headers: {
      'content-type': 'application/json;charset=utf-8',
    },
    body: null,
  })
})
