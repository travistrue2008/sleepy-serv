import { test, expect } from 'bun:test'
import { Fmt, createRequestor } from '../../helpers'
import { StatusCode, createApp } from 'sleepy-serv'
import SleepySocketClient from 'sleepy-socket'

import type { TicketBody } from '../../helpers'

test('when reclaiming with a valid token', async () => {
  const app = await createApp(0, import.meta.dirname)
  const host = app.server.url.hostname
  const port = app.server.port!
  const client = await SleepySocketClient.open(host, port)
  const req = createRequestor(app)

  const res = await req.put(`/ws/${client.id}`, Fmt.Json, {
    headers: new Headers({
      authorization: `Bearer ${client.token}`,
    }),
  })

  await client.close()
  await app.close(true)

  expect(client.id).toBe((res.body as TicketBody).clientId)
})

test('when the token is wrong', async () => {
  const TOKEN_INVALID = 'not-the-real-token'

  const app = await createApp(0, import.meta.dirname)
  const host = app.server.url.hostname
  const port = app.server.port!
  const client = await SleepySocketClient.open(host, port)
  const req = createRequestor(app)

  const res = await req.put(`/ws/${client.id}`, Fmt.Json, {
    headers: new Headers({
      authorization: `Bearer ${TOKEN_INVALID}`,
    }),
  })

  await client.close()
  await app.close(true)

  expect(res.status).toBe(StatusCode.Unauthorized)

  expect(res.body).toStrictEqual({
    message: 'Invalid token',
  })
})
