import { test, expect } from 'bun:test'
import { FMT, Context } from '../../helpers'

test('when making a request with dynamic route param (REST)', async () => {
  const ctx = await Context.create(import.meta.dirname)
  const res = await ctx.makeRequest('/users/123', FMT.TEXT)

  await ctx.shutdown()

  expect(res.status).toBe(200)
  expect(res.body).toBe('Fetching user: 123')
})

test('when making a request with dynamic route param (ws)', async () => {
  const ctx = await Context.create(import.meta.dirname)
  const res = await ctx.sendMessage('GET', '/users/123')

  await ctx.shutdown()

  expect(res.status).toBe(200)
  expect(res.body).toBe('Fetching user: 123')
})
