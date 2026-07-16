import { test, expect } from 'bun:test'
import { FMT, Context } from '../../helpers'

test('when making a root-level request (REST)', async () => {
  const ctx = await Context.create(import.meta.dirname)
  const res = await ctx.makeRequest('/', FMT.TEXT)

  await ctx.shutdown()

  expect(res.status).toBe(200)
  expect(res.body).toBe('Hello world')
})

test('when making a root-level request (ws)', async () => {
  const ctx = await Context.create(import.meta.dirname)
  const res = await ctx.sendMessage('GET', '/')

  await ctx.shutdown()

  expect(res.status).toBe(200)
  expect(res.body).toBe('Hello world')
})
