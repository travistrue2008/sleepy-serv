import axios from 'axios'
import { getPortCounter } from '../../_helpers'
import { createApp } from '../../../src'

import {
  test,
  expect,
} from 'bun:test'

test('when a RequestError sub-type is thrown', async () => {
  const port = getPortCounter()
  const app = await createApp(port, import.meta.dirname)

  const res = await axios.get(`http://localhost:${port}`, {
    validateStatus: () => true,
  })

  await app.server.stop()

  expect(res.status).toBe(422)

  expect(res.data).toStrictEqual({
    firstName: 'Required',
  })
})
