import { test, expect } from 'bun:test'
import { createApp } from 'sleepy-serv'
import SleepySocketClient, { QUEUE } from 'sleepy-socket'

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
  const app = await createApp(0, import.meta.dirname)
  const host = app.server.url.hostname
  const client = await SleepySocketClient.connect(host, app.server.port)
  const results = await makeRequests(client)

  await client.close()
  await app.server.stop(true)

  expect(results).toStrictEqual([2, 3, 1])
})

test('when multiple calls respond out-of-order (queue = NONE)', async () => {
  const app = await createApp(0, import.meta.dirname)
  const host = app.server.url.hostname

  const client = await SleepySocketClient.connect(host, app.server.port, {
    queue: QUEUE.NONE,
  })

  const results = await makeRequests(client)

  await client.close()
  await app.server.stop(true)

  expect(results).toEqual([2, 3, 1])
})

test('when multiple calls respond out-of-order (queue = FIFO)', async () => {
  const app = await createApp(0, import.meta.dirname)
  const host = app.server.url.hostname

  const client = await SleepySocketClient.connect(host, app.server.port, {
    queue: QUEUE.FIFO,
  })

  const results = await makeRequests(client)

  await client.close()
  await app.server.stop(true)

  expect(results).toEqual([1, 2, 3])
})

test('when multiple calls respond out-of-order (queue = LIFO)', async () => {
  const app = await createApp(0, import.meta.dirname)
  const host = app.server.url.hostname

  const client = await SleepySocketClient.connect(host, app.server.port, {
    queue: QUEUE.LIFO,
  })

  const results = await makeRequests(client)

  await client.close()
  await app.server.stop(true)

  expect(results).toEqual([3, 2, 1])
})
