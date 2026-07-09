import { test, expect } from 'bun:test'
import { MethodNotAllowedError } from '../../../src/errors'
import { FMT, Context } from '../../_helpers'

test('when invoking a method on a resource that does not exist', async () => {
  const ctx = await Context.create(import.meta.dirname)
  const res = await ctx.makeRequest('/users', FMT.JSON)

  await ctx.shutdown()

  expect(res.status).toBe(MethodNotAllowedError.status)
  expect(res.body).toBe(null)
})

test('when invoking a socket method on a missing resource', async () => {
  const ctx = await Context.create(import.meta.dirname)
  const res = await ctx.sendMessage('GET', '/users')

  await ctx.shutdown()

  expect(res.status).toBe(MethodNotAllowedError.status)
  expect(res.body).toBe(null)
})
