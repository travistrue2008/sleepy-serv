import SleepySocketClient, { HandshakeError } from 'sleepy-socket'
import { spyOn, test, expect } from 'bun:test'
import { createApp } from 'sleepy-serv'

test('when app middleware rejects the handshake', async () => {
  const app = await createApp(0, import.meta.dirname)
  const host = app.server.url.hostname
  const port = app.server.port!
  const promise = SleepySocketClient.connect(host, port)

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
  const app = await createApp(0, import.meta.dirname)
  const host = app.server.url.hostname
  const port = app.server.port!

  await SleepySocketClient.connect(host, port, {
    reconnect: {
      minDelay: 20,
      random: () => 0,
    },
  }).catch(() => {})

  await new Promise(r => setTimeout(r, 100))
  await app.close(true)

  expect(fetchSpy).toHaveBeenCalledOnce()

  fetchSpy.mockRestore()
})
