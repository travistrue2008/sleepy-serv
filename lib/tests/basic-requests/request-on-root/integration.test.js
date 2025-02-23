import axios from 'axios'
import { getPortCounter } from '../../_helpers'
import { createApp } from '../../../src'

import {
  test,
  expect,
} from 'bun:test'

test('when making root-level request', async () => {
  const port = getPortCounter()
  const app = await createApp(port, import.meta.dirname)
  const res = await axios.get(`http://localhost:${port}`)

  await app.server.stop()

  expect(res.data).toBe('Hello world')
})
