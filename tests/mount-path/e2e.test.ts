import SleepySocketClient, { MessageType } from 'sleepy-socket'
import { StatusCode } from 'sleepy-serv'
import { describe, test, expect } from 'bun:test'
import { createServer, Fmt, createClient } from '../helpers'

const MOUNT_PATH = '/test-mount-path'

describe('REST', () => {
  test('when "mouthPath" is set', async () => {
    const server = await createServer(import.meta.dirname)
    const client = createClient(server)

    const result = await client.get('/', Fmt.Json, {
      mountPath: MOUNT_PATH,
    })

    await server.kill()

    expect(result.status).toBe(StatusCode.Ok)
    expect(result.body).toStrictEqual({ ok: true })
  })
})

describe('WebSocket', () => {
  test('when "mouthPath" is set', async () => {
    const server = await createServer(import.meta.dirname)

    const client = await SleepySocketClient.open(
      'localhost',
      server.port,
      { mountPath: MOUNT_PATH },
    )

    const result = await client.get('/')

    await client.close()
    await server.kill()

    expect(result.status).toBe(StatusCode.Ok)

    expect(result).toStrictEqual({
      id: result.id,
      clientId: client.id!,
      type: MessageType.Response,
      status: StatusCode.Ok,
      timestamp: result.timestamp,
      headers: {
        'content-type': 'application/json;charset=utf-8',
      },
      body: { ok: true },
    })
  })
})
