import { test, expect } from 'bun:test'
import { createApp, StatusCode } from '../../../../src'
import { Fmt, createRequestor, createSocketClient } from '../../../helpers'

test('when middleware throws an error (REST)', async () => {
  const app = await createApp(0, import.meta.dirname)
  const req = createRequestor(app)
  const res = await req.get('/', Fmt.Text)

  await app.close(true)

  expect(res.status).toBe(StatusCode.InternalServerError)
  expect(res.body).toBe('Bad')
})

test('when middleware throws an error (ws)', async () => {
  const app = await createApp(0, import.meta.dirname)
  const ws = await createSocketClient(app)
  const msg = await ws.get('/')

  await app.close(true)

  expect(msg.status).toBe(StatusCode.InternalServerError)
  expect(msg.body).toBe('Bad')
})
