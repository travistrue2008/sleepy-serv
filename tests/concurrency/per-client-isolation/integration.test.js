import SleepySocketClient, { QUEUE } from 'sleepy-socket'
import { jest, test, expect } from 'bun:test'
import { createApp } from 'sleepy-serv'

/*
  Two clients share one server. Each keeps its own pending-request queue, so a
  FIFO client and a LIFO client observe the same racing replies in their own
  order. Real timers, same staggered fixture routes as out-of-order-queue.
 */

function issue(client) {
  const order = []

  const track = label => () => {
    order.push(label)
  }

  const done = Promise.all([
    client.send({ method: 'GET', route: '/slow' }).then(track(1)),
    client.send({ method: 'GET', route: '/fast' }).then(track(2)),
    client.send({ method: 'GET', route: '/mid' }).then(track(3)),
  ])

  return { order, done }
}

test('when two clients with different queue modes share a server', async () => {
  jest.useRealTimers()

  const app = await createApp(0, import.meta.dirname)
  const { port } = app.server

  const fifo = await SleepySocketClient.connect('localhost', port, {
    queue: QUEUE.FIFO,
  })

  const lifo = await SleepySocketClient.connect('localhost', port, {
    queue: QUEUE.LIFO,
  })

  const a = issue(fifo)
  const b = issue(lifo)

  await Promise.all([a.done, b.done])
  await lifo.close()
  await fifo.close()
  await app.server.stop(true)

  expect(a.order).toEqual([1, 2, 3])
  expect(b.order).toEqual([3, 2, 1])
})
