import axios from 'axios'
import { getPortCounter } from '../../_helpers'
import { createApp, middleware } from '../../../src'

import {
  test,
  expect,
} from 'bun:test'

test('when only sibling-level meta middleware is defined', async () => {
  const port = getPortCounter()
  const app = await createApp(port, import.meta.dirname)

  const res = await axios.get(`http://localhost:${port}/users`, {
    validateStatus: () => true,
  })

  await app.server.stop()

  expect(res.status).toBe(200)
  expect(res.data).toBe('sibling-meta')
})
