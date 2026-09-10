import SleepySocketClient, { Queue } from 'sleepy-socket'
import { describe, test, expect } from 'bun:test'
import { createServer } from '../../helpers'

async function makeRequests (
  client: SleepySocketClient,
): Promise<number[]> {
  const results: number[] = []

  await Promise.all([
    client.get('/', { query: { delay: 300 } }).then(() => results.push(1)),
    client.get('/', { query: { delay: 100 } }).then(() => results.push(2)),
    client.get('/', { query: { delay: 200 } }).then(() => results.push(3)),
  ])

  return results
}

describe('WebSocket', () => {
  test('when default "queue" is used', async () => {
    const server = await createServer(import.meta.dirname)
    const client = await SleepySocketClient.open('localhost', server.port)
    const results = await makeRequests(client)

    await client.close()
    await server.kill()

    expect(results).toStrictEqual([2, 3, 1])
  })

  test('when multiple calls respond out-of-order (queue = NONE)', async () => {
    const server = await createServer(import.meta.dirname)

    const client = await SleepySocketClient.open(
      'localhost',
      server.port,
      { queue: Queue.None },
    )

    const results = await makeRequests(client)

    await client.close()
    await server.kill()

    expect(results).toEqual([2, 3, 1])
  })

  test('when multiple calls respond out-of-order (queue = FIFO)', async () => {
    const server = await createServer(import.meta.dirname)

    const client = await SleepySocketClient.open(
      'localhost',
      server.port,
      { queue: Queue.Fifo },
    )

    const results = await makeRequests(client)

    await client.close()
    await server.kill()

    expect(results).toEqual([1, 2, 3])
  })

  test('when multiple calls respond out-of-order (queue = LIFO)', async () => {
    const server = await createServer(import.meta.dirname)

    const client = await SleepySocketClient.open(
      'localhost',
      server.port,
      { queue: Queue.Lifo },
    )

    const results = await makeRequests(client)

    await client.close()
    await server.kill()

    expect(results).toEqual([3, 2, 1])
  })
})
