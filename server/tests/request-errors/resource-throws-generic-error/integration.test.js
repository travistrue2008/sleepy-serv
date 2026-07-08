import { test, expect } from 'bun:test'
import { FMT, Context } from '../../_helpers'
import { InternalServerError } from '../../../src'

test('when a generic error is thrown', async () => {
  const ctx = await Context.create(import.meta.dirname)
  const res = await ctx.makeRequest('/', FMT.TEXT)

  await ctx.shutdown()

  expect(res.status).toBe(InternalServerError.status)
  expect(res.body).toBe('Bad')
})

test('when a socket resource throws a generic error', async () => {
  const ctx = await Context.create(import.meta.dirname)
  const res = await ctx.sendMessage('GET', '/')

  await ctx.shutdown()

  expect(res.status).toBe(InternalServerError.status)
  expect(res.body).toBe('Bad')
})
