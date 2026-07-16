import { test, expect } from 'bun:test'
import { FMT, Context } from '../../../helpers'
import { UnprocessableContentError } from '../../../../src'

test('when a RequestError sub-type is thrown (REST)', async () => {
  const ctx = await Context.create(import.meta.dirname)
  const res = await ctx.makeRequest('/', FMT.JSON)

  await ctx.shutdown()

  expect(res.status).toBe(UnprocessableContentError.status)

  expect(res.body).toStrictEqual([
    {
      path: 'body',
      message: `must have required property 'firstName'`,
    },
  ])
})

test('when a RequestError sub-type is thrown (ws)', async () => {
  const ctx = await Context.create(import.meta.dirname)
  const res = await ctx.sendMessage('GET', '/')

  await ctx.shutdown()

  expect(res.status).toBe(UnprocessableContentError.status)

  expect(res.body).toStrictEqual([
    {
      path: 'body',
      message: `must have required property 'firstName'`,
    },
  ])
})
