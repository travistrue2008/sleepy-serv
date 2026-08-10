import { test, expect } from 'bun:test'
import { Fmt, createRequestor } from '../../helpers'
import { UnauthorizedError, createApp } from 'sleepy-serv'
import SleepySocketClient from 'sleepy-socket'

import type { TicketBody } from '../../helpers'

test('when reclaiming with a valid token', async () => {
  const app = await createApp(0, import.meta.dirname)
  const host = app.server.url.hostname
  const client = await SleepySocketClient.connect(host, app.server.port!)
  const req = createRequestor(app)

  const res = await req.put(`/ws/${client.id}`, Fmt.Json, {
    headers: new Headers({
      authorization: `Bearer ${client.token}`,
    }),
  })

  await client.close()
  await app.server.stop(true)

  expect(client.id).toBe((res.body as TicketBody).clientId)
})

test('when the token is wrong', async () => {
  const TOKEN_INVALID = 'not-the-real-token'

  const app = await createApp(0, import.meta.dirname)
  const host = app.server.url.hostname
  const client = await SleepySocketClient.connect(host, app.server.port!)
  const req = createRequestor(app)

  const res = await req.put(`/ws/${client.id}`, Fmt.Json, {
    headers: new Headers({
      authorization: `Bearer ${TOKEN_INVALID}`,
    }),
  })

  await client.close()
  await app.server.stop(true)

  expect(res.status).toBe(UnauthorizedError.status)

  expect(res.body).toStrictEqual({
    message: 'Invalid token',
  })
})
