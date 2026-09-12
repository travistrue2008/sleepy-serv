import { StatusCode } from 'sleepy-serv'
import { test, expect } from 'bun:test'
import { createServer, createClient, Fmt } from '../../helpers'

test('when POST /ws is called', async () => {
  const server = await createServer(import.meta.dirname)
  const client = createClient(server)
  const res = await client.post('/ws', Fmt.Json)

  await server.kill()

  expect(res.status).toBe(StatusCode.NotFound)
})

test('when GET /ws is called', async () => {
  const server = await createServer(import.meta.dirname)
  const client = createClient(server)

  const res = await client.get('/ws', Fmt.Json, {
    query: { ticket: 'abc' },
  })

  await server.kill()

  expect(res.status).toBe(StatusCode.NotFound)
})

test('when PUT /ws/:clientId is called', async () => {
  const server = await createServer(import.meta.dirname)
  const client = createClient(server)

  const res = await client.put('/ws/some-id', Fmt.Json, {
    headers: new Headers({
      authorization: 'Bearer abc',
    }),
  })

  await server.kill()

  expect(res.status).toBe(StatusCode.NotFound)
})

test('when a regular REST route is called', async () => {
  const server = await createServer(import.meta.dirname)
  const client = createClient(server)
  const res = await client.get('/health', Fmt.Json)

  await server.kill()

  expect(res.status).toBe(StatusCode.Ok)
  expect(res.body).toStrictEqual({ ok: true })
})
