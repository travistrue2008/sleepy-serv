import axios from 'axios'
import { getPortCounter } from '../../_helpers'
import { createApp } from '../../../src'

import {
  test,
  expect,
} from 'bun:test'

test('when middleware throws an error', async () => {
  const port = getPortCounter()
  const app = await createApp(port, import.meta.dirname)

  const res = await axios.get(`http://localhost:${port}`, {
    validateStatus: () => true,
  })

  await app.server.stop()

  expect(res.status).toBe(500)
  expect(res.data).toBe('bad')
})
