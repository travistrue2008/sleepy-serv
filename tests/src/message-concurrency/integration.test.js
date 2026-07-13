import { jest, test, expect } from 'bun:test'
import { QUEUE } from 'sleepy-socket'
import { boot } from '../helpers'

async function makeRequests (client) {
  const results = []

  await Promise.all([
    client.send({
      method: 'GET',
      route: '/',
      query: { delay: 300 },
    }).then(() => results.push(1)),
    client.send({
      method: 'GET',
      route: '/',
      query: { delay: 100 },
    }).then(() => results.push(2)),
    client.send({
      method: 'GET',
      route: '/',
      query: { delay: 200 },
    }).then(() => results.push(3)),
  ])

  return results
}

test('when default "queue" is used', async () => {
  jest.useRealTimers()

  const { client, shutdown } = await boot(import.meta.dirname)
  const results = await makeRequests(client)

  await shutdown()

  expect(results).toStrictEqual([2, 3, 1])
})

test('when multiple calls respond out-of-order (queue = NONE)', async () => {
  jest.useRealTimers()

  const { client, shutdown } = await boot(import.meta.dirname, {
    client: {
      queue: QUEUE.NONE,
    },
  })

  const results = await makeRequests(client)

  await shutdown()

  expect(results).toEqual([2, 3, 1])
})

test('when multiple calls respond out-of-order (queue = FIFO)', async () => {
  jest.useRealTimers()

  const { client, shutdown } = await boot(import.meta.dirname, {
    client: {
      queue: QUEUE.FIFO,
    },
  })

  const results = await makeRequests(client)

  await shutdown()

  expect(results).toEqual([1, 2, 3])
})

test('when multiple calls respond out-of-order (queue = LIFO)', async () => {
  jest.useRealTimers()

  const { client, shutdown } = await boot(import.meta.dirname, {
    client: {
      queue: QUEUE.LIFO,
    },
  })

  const results = await makeRequests(client)

  await shutdown()

  expect(results).toEqual([3, 2, 1])
})
