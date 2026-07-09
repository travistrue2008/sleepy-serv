import { test, expect, mock } from 'bun:test'
import { Context } from '../../_helpers'

test('when adding a hostname', async () => {
  const originalServe = Bun.serve

  Bun.serve = mock().mockReturnValueOnce({
    stop: mock(),
  })

  const ctx = await Context.create(import.meta.dirname, {
    hostname: 'test.sleepy-serv.com',
  })

  await ctx.shutdown()

  expect(Bun.serve).toHaveBeenCalledWith(
    expect.objectContaining({
      hostname: 'test.sleepy-serv.com',
    }),
  )

  Bun.serve = originalServe
})

test('when starting a server, a websocket handler is registered', async () => {
  const originalServe = Bun.serve

  Bun.serve = mock().mockReturnValueOnce({
    stop: mock(),
  })

  const ctx = await Context.create(import.meta.dirname, {
    hostname: 'test.sleepy-serv.com',
  })

  await ctx.shutdown()

  expect(Bun.serve).toHaveBeenCalledWith(
    expect.objectContaining({
      hostname: 'test.sleepy-serv.com',
      websocket: expect.any(Object),
    }),
  )

  Bun.serve = originalServe
})
