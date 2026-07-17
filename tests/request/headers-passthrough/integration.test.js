import { test, expect } from 'bun:test'
import { createApp } from 'sleepy-serv'
import SleepySocketClient, { TYPES } from 'sleepy-socket'

test('when a request carries headers', async () => {
  const app = await createApp(0, import.meta.dirname)
  const host = app.server.url.hostname
  const client = await SleepySocketClient.connect(host, app.server.port)

  const res = await client.send({
    method: 'GET',
    route: '/whoami',
    headers: {
      authorization: 'Bearer xyz',
    },
  })

  await client.close()
  await app.server.stop(true)

  expect(res).toStrictEqual({
    id: res.id,
    clientId: client.clientId,
    type: TYPES.RESPONSE,
    status: 200,
    timestamp: res.timestamp,
    headers: {
      'content-type': 'application/json;charset=utf-8',
    },
    body: { auth: 'Bearer xyz' },
  })
})
