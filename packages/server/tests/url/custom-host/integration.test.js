import { test, expect, mock } from 'bun:test'
import { Context } from '../../helpers'

const HOSTNAME = 'test.sleepy-serv.com'

test('when adding a hostname', async () => {
  const originalServe = Bun.serve

  Bun.serve = mock().mockReturnValueOnce({
    stop: mock(),
  })

  const ctx = await Context.create(import.meta.dirname, {
    hostname: HOSTNAME,
  })

  await ctx.shutdown()

  expect(Bun.serve).toHaveBeenCalledWith(
    expect.objectContaining({
      hostname: HOSTNAME,
    }),
  )

  Bun.serve = originalServe
})
