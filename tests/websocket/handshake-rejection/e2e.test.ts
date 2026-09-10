import SleepySocketClient, { HandshakeError } from 'sleepy-socket'
import { test, expect } from 'bun:test'
import { createServer, wait } from '../../helpers'

test('when app middleware rejects the handshake', async () => {
  const server = await createServer(import.meta.dirname)
  const promise = SleepySocketClient.open('localhost', server.port)

  await expect(promise).rejects.toThrow(HandshakeError)

  await expect(promise).rejects.toMatchObject({
    status: 409,
    body: {
      message: 'Game is full',
    },
  })

  await server.kill()
})

test('when the rejected handshake does not retry', async () => {
  const origFetch = global.fetch
  const server = await createServer(import.meta.dirname)

  let attempts = 0

  global.fetch = (async (...args: Parameters<typeof fetch>) => {
    if (
      typeof args[0] === 'string'
      && args[0].includes(`localhost:${server.port}`)
    ) {
      attempts++
    }

    return origFetch(...args)
  }) as typeof fetch

  await SleepySocketClient.open('localhost', server.port, {
    reconnect: {
      minDelay: 20,
      random: () => 0,
    },
  }).catch(() => {})

  await wait(100)

  global.fetch = origFetch

  await server.kill()

  expect(attempts).toBe(1)
})
