import { test, expect } from 'bun:test'
import { FMT, Context } from '../../_helpers'
import { InternalServerError } from '../../../src'

test('when endpoint does not return "Response" object', async () => {
  const ctx = await Context.create(import.meta.dirname)
  const res = await ctx.makeRequest('/', FMT.TEXT)

  await ctx.shutdown()

  expect(res.status).toBe(InternalServerError.status)
  expect(res.body).toBe('Handler does not return a Response object')
})

test('when a socket endpoint does not return a "Response" object', async () => {
  const ctx = await Context.create(import.meta.dirname)
  const res = await ctx.sendMessage('GET', '/')

  await ctx.shutdown()

  expect(res.status).toBe(InternalServerError.status)
  expect(res.body).toBe('Handler does not return a Response object')
})
