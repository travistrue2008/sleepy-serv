import { test, expect, mock } from 'bun:test'
import { createApp } from '../../../src'

const HOSTNAME = 'test.sleepy-serv.com'

test('when adding a hostname', async () => {
  const originalServe = Bun.serve

  Bun.serve = mock().mockReturnValueOnce({
    stop: mock(),
  })

  const app = await createApp(0, import.meta.dirname, {
    hostname: HOSTNAME,
  })

  await app.server.stop(true)

  expect(Bun.serve).toHaveBeenCalledWith(
    expect.objectContaining({
      hostname: HOSTNAME,
    }),
  )

  Bun.serve = originalServe
})
