import { jest, describe, test, expect } from 'bun:test'
import { QUEUE } from 'sleepy-socket'
import { boot } from '../../_helpers'

/*
  Real timers: the fixture routes sleep for genuinely different durations
  (fast 30ms, mid 70ms, slow 110ms) so their replies race back out of send
  order. The global fake timers (test-setup.js) would freeze Bun.sleep, so each
  test opts back into real time.

  Send order is always slow(1), fast(2), mid(3); replies arrive fast, mid, slow.
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

test('when multiple calls respond out-of-order (queue = NONE)', async () => {
  jest.useRealTimers()

  const { client, shutdown } = await boot(import.meta.dirname, {
    client: {
      queue: QUEUE.NONE,
    },
  })

  const { order, done } = issue(client)

  await done
  await shutdown()

  expect(order).toEqual([2, 3, 1])
})

test('when multiple calls respond out-of-order (queue = FIFO)', async () => {
  jest.useRealTimers()

  const { client, shutdown } = await boot(import.meta.dirname, {
    client: {
      queue: QUEUE.FIFO,
    },
  })

  const { order, done } = issue(client)

  await done
  await shutdown()

  expect(order).toEqual([1, 2, 3])
})

test('when multiple calls respond out-of-order (queue = LIFO)', async () => {
  jest.useRealTimers()

  const { client, shutdown } = await boot(import.meta.dirname, {
    client: {
      queue: QUEUE.LIFO,
    },
  })

  const { order, done } = issue(client)

  await done
  await shutdown()

  expect(order).toEqual([3, 2, 1])
})
