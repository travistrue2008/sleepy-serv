import { test, expect } from 'bun:test'
import { FMT, Context } from '../../helpers'

test('when making a request with querystring (REST)', async () => {
  const ctx = await Context.create(import.meta.dirname)

  const res = await ctx.makeRequest('/', FMT.TEXT, {
    query: {
      userId: 123,
    },
  })

  await ctx.shutdown()

  expect(res.status).toBe(200)
  expect(res.body).toBe('Hello world')
})

test('when making a request with querystring (ws)', async () => {
  const ctx = await Context.create(import.meta.dirname)

  const res = await ctx.sendMessage('GET', '/', {
    query: {
      userId: 123,
    },
  })

  await ctx.shutdown()

  expect(res.status).toBe(200)
  expect(res.body).toBe('Hello world')
})
