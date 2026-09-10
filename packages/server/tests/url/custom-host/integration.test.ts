import { test, expect } from 'bun:test'
import { createServer } from '../../helpers'

// TODO: needs subprocess-compatible approach
// The original test mocked Bun.serve to intercept the hostname option,
// but since the server runs in a subprocess, the mock won't reach it.

const HOSTNAME = 'test.sleepy-serv.com'

test('when adding a hostname', async () => {
  const server = await createServer(import.meta.dirname)

  await server.kill()

  expect(
    server.output.some(
      line => line === 'HOSTNAME:test.sleepy-serv.com',
    ),
  ).toBe(true)
})
