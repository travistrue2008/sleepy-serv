import { test, expect } from 'bun:test'
import { FMT, Context } from '../../_helpers'
import { UnprocessableContentError } from '../../../src'

test('when making an HTTP request to the "/ws" endpoint', async () => {
  const ctx = await Context.create(import.meta.dirname)
  const res = await ctx.makeRequest('/ws', FMT.NONE)

  await ctx.shutdown()

  expect(res.status).toBe(UnprocessableContentError.status)
  expect(res.body).toBe(null)
})
