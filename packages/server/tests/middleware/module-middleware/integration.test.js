import { test, expect } from 'bun:test'
import { FMT, Context } from '../../_helpers'

test('when only module-level middleware is defined', async () => {
  const ctx = await Context.create(import.meta.dirname)
  const res = await ctx.makeRequest('/users', FMT.TEXT)

  await ctx.shutdown()

  expect(res.status).toBe(200)
  expect(res.body).toBe('module')
})

test('when only module-level socket middleware is defined', async () => {
  const ctx = await Context.create(import.meta.dirname)
  const res = await ctx.sendMessage('GET', '/users')

  await ctx.shutdown()

  expect(res.status).toBe(200)
  expect(res.body).toBe('module')
})
