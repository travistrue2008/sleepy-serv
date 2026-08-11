import { describe, test, expect } from 'bun:test'
import { createApp } from 'sleepy-serv'
import { Fmt, createRequestor } from '../../helpers'
import SleepySocketClient, { MessageType } from 'sleepy-socket'

describe('REST', () => {
  test('when request returns a raw text response', async () => {
    const app = await createApp(0, import.meta.dirname)
    const req = createRequestor(app)
    const res = await req.get('/', Fmt.Text)

    expect(res.status).toBe(200)
    expect(res.body).toBe('Just text')
  })
})

describe('WebSocket', () => {
  test('when request returns a raw text response', async () => {
    const app = await createApp(0, import.meta.dirname)
    const host = app.server.url.hostname
    const port = app.server.port!
    const client = await SleepySocketClient.connect(host, port)
    const res = await client.get('/')

    await client.close()
    await app.close(true)

    expect(res).toStrictEqual({
      id: res.id,
      clientId: res.clientId,
      type: MessageType.Response,
      status: 200,
      timestamp: res.timestamp,
      headers: {},
      body: 'Just text',
    })
  })
})
