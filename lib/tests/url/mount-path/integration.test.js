import axios from 'axios'
import { getPortCounter } from '../../_helpers'
import { createApp } from '../../../src'

import {
  test,
  expect,
} from 'bun:test'

test('when adding a mount path', async () => {
  const port = getPortCounter()
  const app = await createApp(port, import.meta.dirname, {
    mountPath: '/test-mount-path',
  })

  const res = await axios.get(`http://localhost:${port}/test-mount-path/users`, {
    validateStatus: () => true,
  })

  await app.server.stop()

  expect(res.status).toBe(200)
  expect(res.data).toBe('Hello world')
})
