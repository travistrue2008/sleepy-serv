import { test, expect } from 'bun:test'
import { createApp, UnprocessableContentError } from 'sleepy-serv'
import SleepySocketClient, { TYPES } from 'sleepy-socket'

test('when the request envelope fails schema validation', async () => {
  const app = await createApp(0, import.meta.dirname)
  const host = app.server.url.hostname
  const client = await SleepySocketClient.connect(host, app.server.port)
  const res = await client.send({ route: '/' })

  await client.close()
  await app.server.stop(true)

  expect(res).toStrictEqual({
    id: res.id,
    clientId: client.id,
    type: TYPES.RESPONSE,
    timestamp: res.timestamp,
    status: UnprocessableContentError.status,
    headers: {
      'content-type': 'application/json;charset=utf-8',
    },
    body: [
      {
        path: '',
        message: `must have required property 'method'`,
      },
    ],
  })
})
