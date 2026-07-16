import { test, expect } from 'bun:test'
import { FMT, Context } from '../../../helpers'
import { MethodNotAllowedError } from '../../../../src/errors'

test('when requested method on resource does not exist (REST)', async () => {
  const ctx = await Context.create(import.meta.dirname)
  const res = await ctx.makeRequest('/users', FMT.JSON, { method: 'GET' })

  await ctx.shutdown()

  expect(res.status).toBe(MethodNotAllowedError.status)
  expect(res.body).toBe(null)
})

test('when requested method on resource does not exist (ws)', async () => {
  const ctx = await Context.create(import.meta.dirname)
  const res = await ctx.sendMessage('GET', '/users')

  await ctx.shutdown()

  expect(res.status).toBe(MethodNotAllowedError.status)
  expect(res.body).toBe(null)
})
