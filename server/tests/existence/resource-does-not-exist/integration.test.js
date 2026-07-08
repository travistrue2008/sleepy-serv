import { test, expect } from 'bun:test'
import { FMT, Context } from '../../_helpers'
import { NotFoundError } from '../../../src'

test('when invoking a resource that does not exist', async () => {
  const ctx = await Context.create(import.meta.dirname)
  const res = await ctx.makeRequest('/users/123/photos', FMT.JSON)

  await ctx.shutdown()

  expect(res.status).toBe(NotFoundError.status)
  expect(res.body).toBe(null)
})

test('when invoking a socket resource that does not exist', async () => {
  const ctx = await Context.create(import.meta.dirname)
  const res = await ctx.sendMessage('GET', '/users/123/photos')

  await ctx.shutdown()

  expect(res.status).toBe(NotFoundError.status)
  expect(res.body).toBe(null)
})
