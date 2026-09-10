import SleepySocketClient from 'sleepy-socket'
import { CloseCode } from 'sleepy-serv'
import { mock, test, expect } from 'bun:test'
import { createServer, waitFor } from '../../helpers'

test('when closed from client AND reconnect enabled', async () => {
  const handler = mock()
  const server = await createServer(import.meta.dirname)

  const client = await SleepySocketClient.open('localhost', server.port, {
    reconnect: {
      minDelay: 100,
      random: () => 0,
    },
  })

  client.on('close', handler)

  await client.close()
  await waitFor(() => server.output.some(l => l.startsWith('CLOSE:')))
  await server.kill()

  const closeLines = server.output.filter(l => l.startsWith('CLOSE:'))

  expect(handler).toHaveBeenCalledOnce()
  expect(handler).toHaveBeenCalledWith({ code: CloseCode.Ok })
  expect(closeLines).toHaveLength(1)
  expect(closeLines[0]).toBe(`CLOSE:${client.id}:ok`)
})

test('when closed from client AND reconnect disabled', async () => {
  const handler = mock()
  const server = await createServer(import.meta.dirname)

  const client = await SleepySocketClient.open(
    'localhost',
    server.port,
    { reconnect: false },
  )

  client.on('close', handler)

  await client.close()
  await waitFor(() => server.output.some(l => l.startsWith('CLOSE:')))
  await server.kill()

  const closeLines = server.output.filter(l => l.startsWith('CLOSE:'))

  expect(handler).toHaveBeenCalledOnce()
  expect(handler).toHaveBeenCalledWith({ code: CloseCode.Ok })
  expect(closeLines).toHaveLength(1)
  expect(closeLines[0]).toBe(`CLOSE:${client.id}:ok`)
})
