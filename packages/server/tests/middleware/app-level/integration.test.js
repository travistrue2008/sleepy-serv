import { test, expect } from 'bun:test'
import { FMT, Context } from '../../helpers'

test('when app-level middleware is defined (REST)', async () => {
  const ctx = await Context.create(import.meta.dirname, {
    middleware: [
      (_req, res, next) => next({
        ...res,
        output: 'root',
      }),
    ],
  })

  const res = await ctx.makeRequest('/users', FMT.TEXT)

  await ctx.shutdown()

  expect(res.status).toBe(200)
  expect(res.body).toBe('root')
})

test('when app-level middleware is defined (ws)', async () => {
  const ctx = await Context.create(import.meta.dirname, {
    middleware: [
      (_req, res, next) => next({
        ...res,
        output: 'root',
      }),
    ],
  })

  const res = await ctx.sendMessage('GET', '/users')

  await ctx.shutdown()

  expect(res.status).toBe(200)
  expect(res.body).toBe('root')
})
