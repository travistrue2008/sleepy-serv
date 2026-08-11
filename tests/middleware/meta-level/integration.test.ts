import { test, expect } from 'bun:test'
import { createApp } from 'sleepy-serv'
import { Fmt, createRequestor } from '../../helpers'
import SleepySocketClient, { MessageType } from 'sleepy-socket'

test('when meta middleware writes to res (REST)', async () => {
  const app = await createApp(0, import.meta.dirname)
  const req = createRequestor(app)
  const res = await req.get('/', Fmt.Json)

  await app.close(true)

  expect(res.status).toBe(200)
  expect(res.body).toStrictEqual({ stamp: 'via-meta' })
})

test('when meta middleware writes to res (ws)', async () => {
  const app = await createApp(0, import.meta.dirname)
  const host = app.server.url.hostname
  const port = app.server.port!
  const client = await SleepySocketClient.connect(host, port)
  const res = await client.get('/')

  await client.close()
  await app.close(true)

  expect(res).toStrictEqual({
    id: res.id,
    clientId: client.id!,
    type: MessageType.Response,
    status: 200,
    timestamp: res.timestamp,
    headers: {
      'content-type': 'application/json;charset=utf-8',
    },
    body: {
      stamp: 'via-meta',
    },
  })
})
