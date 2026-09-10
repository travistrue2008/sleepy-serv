import SleepySocketClient from 'sleepy-socket'
import { StatusCode } from 'sleepy-serv'
import { test, expect } from 'bun:test'
import { createServer, Fmt, createClient } from '../../helpers'

test('when a willingly-closed clientId is reclaimed', async () => {
  const server = await createServer(import.meta.dirname)
  const client = await SleepySocketClient.open('localhost', server.port)
  const reqClient = createClient(server)

  await client.close()

  const result = await reqClient.put(`/ws/${client.id}`, Fmt.Json, {
    headers: new Headers({
      authorization: `Bearer ${client.token}`,
    }),
  })

  await server.kill()

  expect(result.status).toBe(StatusCode.NotFound)
  expect(result.body).toBe(null)
})
