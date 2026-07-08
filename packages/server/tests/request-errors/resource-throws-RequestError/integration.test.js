import { test, expect } from 'bun:test'
import { FMT, Context } from '../../_helpers'
import { UnprocessableContentError } from '../../../src'

test('when a RequestError sub-type is thrown', async () => {
  const ctx = await Context.create(import.meta.dirname)
  const res = await ctx.makeRequest('/', FMT.JSON)

  await ctx.shutdown()

  expect(res.status).toBe(UnprocessableContentError.status)

  expect(res.body).toStrictEqual({
    firstName: 'Required',
  })
})

test('when a socket resource throws a RequestError sub-type', async () => {
  const ctx = await Context.create(import.meta.dirname)
  const res = await ctx.sendMessage('GET', '/')

  await ctx.shutdown()

  expect(res.status).toBe(UnprocessableContentError.status)

  expect(res.body).toStrictEqual({
    firstName: 'Required',
  })
})
