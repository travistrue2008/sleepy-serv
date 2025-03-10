import { getPortCounter } from '../../_helpers'
import { createApp } from '../../../src'

import {
  mock,
  test,
  expect,
} from 'bun:test'

test('when adding a hostname', async () => {
  const originalServe = Bun.serve

  Bun.serve = mock().mockReturnValueOnce({
    stop: mock(),
  })

  const port = getPortCounter()

  await createApp(port, import.meta.dirname, {
    hostname: 'test.sleepy-serv.com',
  })

  expect(Bun.serve).toHaveBeenCalledWith(
    expect.objectContaining({
      hostname: 'test.sleepy-serv.com',
    })
  )

  Bun.serve = originalServe
})
