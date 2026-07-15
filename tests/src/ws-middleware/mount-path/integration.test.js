import { test, expect } from 'bun:test'
import { createServer } from '../../helpers'

import {
  NotFoundError,
  UnauthorizedError,
} from 'sleepy-serv'

/*
  With a non-empty mountPath, the handshake endpoints mount alongside the app's
  routes at `{mountPath}/ws`, so an api/ws method file merges with the built-in
  terminal there: the guard runs and the terminal still mints. The unmounted /ws
  path is not served.
 */

const MOUNT_PATH = '/app'
const WS_HEADER = { 'x-ws': '1' }

test('when the mounted mint endpoint lacks the header', async () => {
  const server = await createServer(import.meta.dirname, {
    mountPath: MOUNT_PATH,
  })

  const res = await fetch(`http://localhost:${server.port}${MOUNT_PATH}/ws`, {
    method: 'POST',
  })

  await server.stop(true)

  expect(res.status).toBe(UnauthorizedError.status)
})

test('when the mounted mint endpoint is called with the header', async () => {
  const server = await createServer(import.meta.dirname, {
    mountPath: MOUNT_PATH,
  })

  const res = await fetch(`http://localhost:${server.port}${MOUNT_PATH}/ws`, {
    method: 'POST',
    headers: WS_HEADER,
  })

  const body = await res.json()

  await server.stop(true)

  expect(res.status).toBe(200)
  expect(body).toHaveProperty('clientId')
  expect(body).toHaveProperty('ticket')
})

test('when the unmounted path is requested', async () => {
  const server = await createServer(import.meta.dirname, {
    mountPath: MOUNT_PATH,
  })

  const res = await fetch(`http://localhost:${server.port}/ws`, {
    method: 'POST',
  })

  await server.stop(true)

  expect(res.status).toBe(NotFoundError.status)
})
