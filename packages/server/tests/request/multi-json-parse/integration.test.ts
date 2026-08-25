import { test, expect } from 'bun:test'
import { StatusCode, createApp } from '../../../src'
import { Fmt, createRequestor } from '../../helpers'

const BODY = JSON.stringify({ message: 'hello' })

const JSON_HEADERS = new Headers({
  'content-type': 'application/json;charset=utf-8',
})

test('when req.json() is called twice (REST)', async () => {
  const app = await createApp(0, import.meta.dirname)
  const req = createRequestor(app)

  const res = await req.post('/', Fmt.Json, {
    headers: JSON_HEADERS,
    body: BODY,
  })

  await app.close(true)

  expect(res.status).toBe(StatusCode.Ok)

  expect(res.body).toStrictEqual({
    first: { message: 'hello' },
    second: { message: 'hello' },
  })
})
