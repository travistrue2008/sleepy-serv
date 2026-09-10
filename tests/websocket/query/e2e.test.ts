import SleepySocketClient from 'sleepy-socket'
import { test, expect } from 'bun:test'
import { createServer, Fmt, createClient } from '../../helpers'

test('when querying all active sessions', async () => {
  const server = await createServer(import.meta.dirname)
  const client = createClient(server)
  const clientA = await SleepySocketClient.open('localhost', server.port)
  const clientB = await SleepySocketClient.open('localhost', server.port)

  const result = await client.get('/lobby', Fmt.Json)

  await clientA.close()
  await clientB.close()
  await server.kill()

  expect(result.status).toBe(200)

  expect(result.body).toStrictEqual([
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
