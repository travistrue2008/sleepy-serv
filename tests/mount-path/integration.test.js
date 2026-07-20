import { describe, test, expect } from 'bun:test'
import { createApp } from 'sleepy-serv'
import { FMT, createRequestor } from '../helpers'
import SleepySocketClient, { TYPES } from 'sleepy-socket'

const MOUNT_PATH = '/test-mount-path'

describe('REST', () => {
  test('when "mouthPath" is set', async () => {
    const app = await createApp(0, import.meta.dirname, {
      mountPath: MOUNT_PATH,
    })

    const req = createRequestor(app)

    const res = await req.get('/', FMT.JSON, {
      mountPath: MOUNT_PATH,
    })

    await app.server.stop(true)

    expect(res.status).toBe(200)
    expect(res.body).toStrictEqual({ ok: true })
  })
})

describe('WebSocket', () => {
  test('when "mouthPath" is set', async () => {
    const app = await createApp(0, import.meta.dirname, {
      mountPath: MOUNT_PATH,
    })

    const host = app.server.url.hostname

    const client = await SleepySocketClient.connect(host, app.server.port, {
      mountPath: MOUNT_PATH,
    })

    const res = await client.send({
      method: 'GET',
      route: '/',
    })

    await client.close()
    await app.server.stop(true)

    expect(res.status).toBe(200)

    expect(res).toStrictEqual({
      id: res.id,
      clientId: client.id,
      type: TYPES.RESPONSE,
      status: 200,
      timestamp: res.timestamp,
      headers: {
        'content-type': 'application/json;charset=utf-8',
      },
      body: { ok: true },
    })
  })
})
