import { test, expect } from 'bun:test'
import { FMT, Context } from '../../_helpers'

test('when sending a querystring', async () => {
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

test('when sending a socket request with a query', async () => {
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
