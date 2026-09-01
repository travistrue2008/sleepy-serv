import { describe, test, expect } from 'bun:test'
import { StatusCode, createApp } from 'sleepy-serv'
import { Fmt, createRequestor } from '../../helpers'
import SleepySocketClient, { MessageType } from 'sleepy-socket'

describe('REST', () => {
  test.each([
    'PUT',
    'PATCH',
    'DELETE',
  ])('when making a %s request', async method => {
    const app = await createApp(0, import.meta.dirname)
    const req = createRequestor(app)
    const verb = method.toLowerCase() as Lowercase<typeof method>
    const fn = req[verb]

    console.log('method:', method)
    console.log('fn:', fn)

    const res = await fn('/resource', Fmt.Json)

    console.log('res:', res)

    await app.close(true)

    expect(res.status).toBe(StatusCode.Ok)
    expect(res.body).toStrictEqual({ method })
  })
})

describe('WebSocket', () => {
  test.each([
    'PUT',
    'PATCH',
    'DELETE',
  ])('when making a %s request', async method => {
    const app = await createApp(0, import.meta.dirname)
    const host = app.server.url.hostname
    const port = app.server.port!
    const client = await SleepySocketClient.open(host, port)
    const verb = method.toLowerCase() as Lowercase<typeof method>
    const res = await client[verb]('/resource')

    await client.close()
    await app.close(true)

    expect(res).toStrictEqual({
      id: res.id,
      clientId: client.id!,
      type: MessageType.Response,
      status: StatusCode.Ok,
      timestamp: res.timestamp,
      headers: {
        'content-type': 'application/json;charset=utf-8',
      },
      body: { method },
    })
  })
})
