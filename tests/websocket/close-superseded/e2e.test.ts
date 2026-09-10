import SleepySocketClient from 'sleepy-socket'
import { mock, test, expect } from 'bun:test'
import { Fmt, waitFor, createServer, createClient } from '../../helpers'

test('when superseded AND reconnect enabled', async () => {
  const handler = mock()
  const server = await createServer(import.meta.dirname)
  const reqClient = createClient(server)

  const client = await SleepySocketClient.open('localhost', server.port, {
    reconnect: {
      minDelay: 20,
      random: () => 0,
    },
  })

  client.on('close', handler)

  const reclaimResult = await reqClient.put(`/ws/${client.id}`, Fmt.Json, {
    headers: new Headers({
      authorization: `Bearer ${client.token}`,
    }),
  })

  const { ticket } = reclaimResult.body as { ticket: string }

  const ws2 = new WebSocket(
    `ws://localhost:${server.port}/ws?ticket=${ticket}`,
  )

  await new Promise<void>(resolve => {
    ws2.addEventListener('message', () => resolve(), { once: true })
  })

  await waitFor(() => handler.mock.calls.length > 0)

  ws2.close()

  await server.kill()

  const closeLines = server.output.filter(l => l.startsWith('CLOSE:'))

  expect(handler).toHaveBeenCalledOnce()
  expect(closeLines[0]).toBe(`CLOSE:${client.id}:superseded`)
})

test('when superseded AND reconnect disabled', async () => {
  const handler = mock()
  const server = await createServer(import.meta.dirname)
  const reqClient = createClient(server)

  const client = await SleepySocketClient.open(
    'localhost',
    server.port,
    { reconnect: false },
  )

  client.on('close', handler)

  const reclaimResult = await reqClient.put(`/ws/${client.id}`, Fmt.Json, {
    headers: new Headers({
      authorization: `Bearer ${client.token}`,
    }),
  })

  const { ticket } = reclaimResult.body as { ticket: string }

  const ws2 = new WebSocket(
    `ws://localhost:${server.port}/ws?ticket=${ticket}`,
  )

  await new Promise<void>(resolve => {
    ws2.addEventListener('message', () => resolve(), { once: true })
  })

  await waitFor(() => handler.mock.calls.length > 0)

  ws2.close()

  await server.kill()

  const closeLines = server.output.filter(l => l.startsWith('CLOSE:'))

  expect(handler).toHaveBeenCalledOnce()
  expect(closeLines[0]).toBe(`CLOSE:${client.id}:superseded`)
})
