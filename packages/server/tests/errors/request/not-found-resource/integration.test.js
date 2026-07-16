import { test, expect } from 'bun:test'
import { FMT, Context } from '../../../helpers'
import { NotFoundError } from '../../../../src'

test('when requested resource is not found (REST)', async () => {
  const ctx = await Context.create(import.meta.dirname)
  const res = await ctx.makeRequest('/users/123/photos', FMT.JSON)

  await ctx.shutdown()

  expect(res.status).toBe(NotFoundError.status)
  expect(res.body).toBe(null)
})

test('when requested resource is not found (ws)', async () => {
  const ctx = await Context.create(import.meta.dirname)
  const res = await ctx.sendMessage('GET', '/users/123/photos')

  await ctx.shutdown()

  expect(res.status).toBe(NotFoundError.status)
  expect(res.body).toBe(null)
})
