import { test, expect } from 'bun:test'
import { createServer, createClient } from '../../helpers'

test('when the app is closed', async () => {
  const server = await createServer(import.meta.dirname)
  const reqClient = createClient(server)

  await server.kill()

  const promise = reqClient.get('/', null)

  await expect(promise).rejects.toThrow(
    new TypeError(
      'Unable to connect. Is the computer able to access the url?',
    ),
  )

  const closed = server.output.some(line => line.includes('CLOSED'))

  expect(closed).toBe(true)
})
