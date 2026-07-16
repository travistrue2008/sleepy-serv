import { test, expect } from 'bun:test'
import { FMT, Context } from '../../helpers'

test('when sibling-level meta middleware is defined (REST)', async () => {
  const ctx = await Context.create(import.meta.dirname)
  const res = await ctx.makeRequest('/users', FMT.TEXT)

  await ctx.shutdown()

  expect(res.status).toBe(200)
  expect(res.body).toBe('sibling-meta')
})

test('when sibling-level meta middleware is defined (ws)', async () => {
  const ctx = await Context.create(import.meta.dirname)
  const res = await ctx.sendMessage('GET', '/users')

  await ctx.shutdown()

  expect(res.status).toBe(200)
  expect(res.body).toBe('sibling-meta')
})
