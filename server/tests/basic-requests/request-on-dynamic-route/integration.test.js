import axios from 'axios'
import { getPortCounter } from '../../_helpers'
import { createApp } from '../../../src'

import {
  test,
  expect,
} from 'bun:test'

test('when making a request on a dynamic route', async () => {
  const port = getPortCounter()
  const app = await createApp(port, import.meta.dirname)
  const res = await axios.get(`http://localhost:${port}/users/123`)

  await app.server.stop()

  expect(res.data).toBe('Fetching user: 123')
})
