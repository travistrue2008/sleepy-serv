import axios from 'axios'
import { getPortCounter } from '../../_helpers'
import { createApp } from '../../../src'

import {
  test,
  expect,
} from 'bun:test'

test('when sending a querystring', async () => {
  const port = getPortCounter()
  const app = await createApp(port, import.meta.dirname)

  const res = await axios.get(`http://localhost:${port}`, {
    validateStatus: () => true,
    params: {
      userId: 123,
    },
  })

  await app.server.stop()

  expect(res.status).toBe(200)
  expect(res.data).toBe('Hello world')
})
