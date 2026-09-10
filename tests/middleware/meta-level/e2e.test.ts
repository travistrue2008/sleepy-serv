import SleepySocketClient, { MessageType } from 'sleepy-socket'
import { test, expect } from 'bun:test'
import { createServer, Fmt, createClient } from '../../helpers'

test('when meta middleware writes to res (REST)', async () => {
  const server = await createServer(import.meta.dirname)
  const client = createClient(server)
  const result = await client.get('/', Fmt.Json)

  await server.kill()

  expect(result.status).toBe(200)
  expect(result.body).toStrictEqual({ stamp: 'via-meta' })
})

test('when meta middleware writes to res (ws)', async () => {
  const server = await createServer(import.meta.dirname)
  const client = await SleepySocketClient.open('localhost', server.port)
  const result = await client.get('/')

  await client.close()
  await server.kill()

  expect(result.status).toBe(200)

  expect(result).toStrictEqual({
    id: result.id,
    clientId: client.id!,
    type: MessageType.Response,
    status: 200,
    timestamp: result.timestamp,
    headers: {
      'content-type': 'application/json;charset=utf-8',
    },
    body: {
      stamp: 'via-meta',
    },
  })
})
