import SleepySocketClient from 'sleepy-socket'
import { mock, test, expect } from 'bun:test'
import { createServer, wait, waitFor, waitForCloseCount } from '../../helpers'

const OPTS_RECONNECT = {
  reconnect: {
    minDelay: 20,
    random: () => 0,
  },
}

test('when reconnect enabled', async () => {
  const handler = mock()
  const server = await createServer(import.meta.dirname)

  const client = await SleepySocketClient.open(
    'localhost',
    server.port,
    OPTS_RECONNECT,
  )

  client.on('close', handler)
  client.socket!.close(4000, 'custom')

  await waitFor(() => !client.isConnected)
  await wait(100)
  await server.kill()

  const closeLines = server.output.filter(l => l.startsWith('CLOSE:'))

  expect(client.isReconnecting).toBe(false)
  expect(handler).toHaveBeenCalledOnce()

  expect(handler).toHaveBeenCalledWith({
    code: 4000,
    reason: 'custom',
  })

  expect(closeLines).toStrictEqual([`CLOSE:${client.id}:custom`])
})

test('when reconnect disabled', async () => {
  const handler = mock()
  const server = await createServer(import.meta.dirname)

  const client = await SleepySocketClient.open(
    'localhost',
    server.port,
    { reconnect: false },
  )

  client.on('close', handler)
  client.socket!.close(4000, 'custom')

  await waitFor(() => !client.isConnected)
  await wait(100)
  await server.kill()

  const closeLines = server.output.filter(l => l.startsWith('CLOSE:'))

  expect(handler).toHaveBeenCalledOnce()

  expect(handler).toHaveBeenCalledWith({
    code: 4000,
    reason: 'custom',
  })

  expect(closeLines).toStrictEqual([`CLOSE:${client.id}:custom`])
})
