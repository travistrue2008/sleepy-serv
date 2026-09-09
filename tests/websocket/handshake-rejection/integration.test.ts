import SleepySocketClient, { HandshakeError } from 'sleepy-socket'
import { createApp } from 'sleepy-serv'
import { spyOn, test, expect } from 'bun:test'

test('when app middleware rejects the handshake', async () => {
  const app = createApp(0)
  const host = app.server.url.hostname
  const port = app.server.port!
  const promise = SleepySocketClient.open(host, port)

  await expect(promise).rejects.toThrow(HandshakeError)

  await expect(promise).rejects.toMatchObject({
    status: 409,
    body: {
      message: 'Game is full',
    },
  })

  await app.close(true)
})

test('when the rejected handshake does not retry', async () => {
  const fetchSpy = spyOn(global, 'fetch')
  const app = createApp(0)
  const host = app.server.url.hostname
  const port = app.server.port!

  await SleepySocketClient.open(host, port, {
    reconnect: {
      minDelay: 20,
      random: () => 0,
    },
  }).catch(() => {})

  await app.close(true)

  expect(fetchSpy).toHaveBeenCalledOnce()

  expect(fetchSpy).toHaveBeenCalledWith(
    `${app.server.url.origin}/ws`,
    { method: 'POST' },
  )

  fetchSpy.mockRestore()
})
