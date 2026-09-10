import SleepySocketClient from 'sleepy-socket'
import { test, expect } from 'bun:test'
import { createServer, Fmt, createClient } from '../../helpers'

import type { TicketBody } from '../../helpers'

test('when reclaiming with a valid token', async () => {
  const server = await createServer(import.meta.dirname)
  const client = await SleepySocketClient.open('localhost', server.port)
  const reqClient = createClient(server)

  const result = await reqClient.put(
    `/ws/${client.id}`,
    Fmt.Json,
    {
      headers: new Headers({
        authorization: `Bearer ${client.token}`,
      }),
    },
  )

  await client.close()
  await server.kill()

  expect(client.id).toBe((result.body as TicketBody).clientId)
})

test('when the token is wrong', async () => {
  const TOKEN_INVALID = 'not-the-real-token'

  const server = await createServer(import.meta.dirname)
  const client = await SleepySocketClient.open('localhost', server.port)

  const reqClient = createClient(server)

  const result = await reqClient.put(
    `/ws/${client.id}`,
    Fmt.Json,
    {
      headers: new Headers({
        authorization: `Bearer ${TOKEN_INVALID}`,
      }),
    },
  )

  await client.close()
  await server.kill()

  expect(result.status).toBe(401)

  expect(result.body).toStrictEqual({
    message: 'Invalid token',
  })
})
