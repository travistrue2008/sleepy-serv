import { test, expect } from 'bun:test'

import {
  Fmt,
  createServer,
  createClient,
} from '../../helpers'

const BODY = JSON.stringify({ message: 'hello' })

const JSON_HEADERS = new Headers({
  'content-type': 'application/json;charset=utf-8',
})

test('when req.json() is called twice (REST)', async () => {
  const server = await createServer(import.meta.dirname)
  const client = createClient(server)

  const result = await client.post('/', Fmt.Json, {
    headers: JSON_HEADERS,
    body: BODY,
  })

  await server.kill()

  expect(result.status).toBe(200)

  expect(result.body).toStrictEqual({
    first: { message: 'hello' },
    second: { message: 'hello' },
  })
})
