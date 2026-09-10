import { test, expect } from 'bun:test'
import { createServer } from '../../helpers'

test('when the app is closed', async () => {
  const server = await createServer(import.meta.dirname)
  const port = server.port

  await server.kill()

  const promise = fetch(`http://localhost:${port}`)

  await expect(promise).rejects.toThrow()

  const closed = server.output.some(line => line.includes('CLOSED'))

  expect(closed).toBe(true)
})
