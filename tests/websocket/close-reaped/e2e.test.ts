import SleepySocketClient from 'sleepy-socket'
import { CloseCode } from 'sleepy-serv'
import { mock, test, expect } from 'bun:test'
import { createServer, wait, waitFor } from '../../helpers'

test('when reaped AND reconnect enabled', async () => {
  const handler = mock()
  const server = await createServer(import.meta.dirname)

  const client = await SleepySocketClient.open('localhost', server.port, {
    serverTimeout: 500,
    reconnect: {
      minDelay: 20,
      random: () => 0,
    },
  })

  client.on('close', handler)

  await waitFor(() => !client.isConnected)
  await waitFor(() => client.isConnected)
  await client.close()

  await waitFor(() =>
    server.output.filter(l => l.startsWith('CLOSE:')).length >= 2,
  )

  await server.kill()

  const closeLines = server.output.filter(l => l.startsWith('CLOSE:'))

  expect(handler).toHaveBeenCalledTimes(2)
  expect(handler).toHaveBeenNthCalledWith(1, { code: CloseCode.Reaped })
  expect(handler).toHaveBeenNthCalledWith(2, { code: CloseCode.Ok })
  expect(closeLines).toHaveLength(2)
  expect(closeLines[0]).toBe(`CLOSE:${client.id}:reaped`)
  expect(closeLines[1]).toBe(`CLOSE:${client.id}:ok`)
})

test('when reaped AND reconnect disabled', async () => {
  const handler = mock()
  const server = await createServer(import.meta.dirname)

  const client = await SleepySocketClient.open('localhost', server.port, {
    serverTimeout: 500,
    reconnect: false,
  })

  client.on('close', handler)

  await waitFor(() => !client.isConnected)
  await wait(100)
  await server.kill()

  const closeLines = server.output.filter(l => l.startsWith('CLOSE:'))

  expect(handler).toHaveBeenCalledOnce()
  expect(handler).toHaveBeenCalledWith({ code: CloseCode.Reaped })
  expect(closeLines).toHaveLength(1)
  expect(closeLines[0]).toBe(`CLOSE:${client.id}:reaped`)
})
