import { test, expect } from 'bun:test'
import { FMT, Context } from '../../../helpers'
import { InternalServerError } from '../../../../src'

test('when middleware throws an error (REST)', async () => {
  const ctx = await Context.create(import.meta.dirname)
  const res = await ctx.makeRequest('/', FMT.TEXT)

  await ctx.shutdown()

  expect(res.status).toBe(InternalServerError.status)
  expect(res.body).toBe('Bad')
})

test('when middleware throws an error (ws)', async () => {
  const ctx = await Context.create(import.meta.dirname)
  const res = await ctx.sendMessage('GET', '/')

  await ctx.shutdown()

  expect(res.status).toBe(InternalServerError.status)
  expect(res.body).toBe('Bad')
})
