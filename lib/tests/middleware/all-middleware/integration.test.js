import axios from 'axios'
import { getPortCounter } from '../../_helpers'
import { createApp, middleware } from '../../../src'

import {
  test,
  expect,
} from 'bun:test'

test('when all levels of middleware are defined', async () => {
  const port = getPortCounter()
  const app = await createApp(port, import.meta.dirname, {
    middleware: [
      req => {
        req.result = ['root']
      },
    ],
  })

  const res = await axios.get(`http://localhost:${port}/users`, {
    validateStatus: () => true,
  })

  await app.server.stop()

  expect(res.status).toBe(200)
  expect(res.data).toBe('root|parent-meta|sibling-meta|module')
})
