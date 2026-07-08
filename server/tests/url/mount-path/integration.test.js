import { test, expect } from 'bun:test'
import { FMT, Context } from '../../_helpers'

test('when adding a mount path', async () => {
  const ctx = await Context.create(import.meta.dirname, {
    mountPath: '/test-mount-path',
  })

  const res = await ctx.makeRequest('/test-mount-path/users', FMT.TEXT)

  await ctx.shutdown()

  expect(res.status).toBe(200)
  expect(res.body).toBe('Hello world')
})

test('when adding a mount path to a socket request', async () => {
  const ctx = await Context.create(import.meta.dirname, {
    mountPath: '/test-mount-path',
  })

  const res = await ctx.sendMessage('GET', '/test-mount-path/users')

  await ctx.shutdown()

  expect(res.status).toBe(200)
  expect(res.body).toBe('Hello world')
})
