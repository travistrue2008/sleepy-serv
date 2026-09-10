import SleepySocketClient from 'sleepy-socket'
import { mock, test, expect } from 'bun:test'
import { createServer, wait, waitFor, waitForCloseCount } from '../../helpers'

/*
  CHECK:
    Claude suggests that this simulates a dropped client from the server
    side, but that doesn't make sense because we can just simulate that by
    dropping the client via the server (which we do in another test suite).
    More importantly:
      - Dropping from the server seems to give inconsistent reasons
      - Dropping from the client seems to give inconsistent reasons as well
      - There doesn't appear to be a way to correct this
 */

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
  client.socket!.close(4000)

  await waitFor(() => !client.isConnected)
  await waitFor(() => client.isConnected)
  await client.close()

  await waitForCloseCount(server, 2)
  await server.kill()

  const closeLines = server.output.filter(l => l.startsWith('CLOSE:'))

  expect(handler).toHaveBeenCalledTimes(2)
  expect(handler).toHaveBeenNthCalledWith(1, { code: 4000 })
  expect(handler).toHaveBeenNthCalledWith(2, { code: 1000 })

  expect(closeLines).toStrictEqual([
    `CLOSE:${client.id}:dropped`,
    `CLOSE:${client.id}:ok`,
  ])
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
  client.socket!.close(4000)

  await waitFor(() => !client.isConnected)
  await wait(100) /* reconnect should NOT happen during this time */
  await server.kill()

  const closeLines = server.output.filter(l => l.startsWith('CLOSE:'))

  expect(handler).toHaveBeenCalledOnce()
  expect(handler).toHaveBeenCalledWith({ code: 4000 })
  expect(closeLines).toStrictEqual([`CLOSE:${client.id}:dropped`])
})
