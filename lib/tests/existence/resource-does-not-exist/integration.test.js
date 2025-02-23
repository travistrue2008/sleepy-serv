import axios from 'axios'
import { getPortCounter } from '../../_helpers'
import { createApp } from '../../../src'

import {
  test,
  expect,
} from 'bun:test'

test('when invoking a resource that does not exist', async () => {
  const port = getPortCounter()
  const app = await createApp(port, import.meta.dirname)

  const res = await axios.get(`http://localhost:${port}/users/123/photos`, {
    validateStatus: () => true,
  })

  await app.server.stop()

  expect(res.status).toBe(404)
})
