import { test, expect, mock } from 'bun:test'
import { FMT, Context } from '../../helpers'

test('when all levels of middleware are defined (REST)', async () => {
  const ctx = await Context.create(import.meta.dirname, {
    middleware: [
      (_req, res, next) => next({
        ...res,
        list: ['root'],
      }),
    ],
  })

  const res = await ctx.makeRequest('/users', FMT.TEXT)

  await ctx.shutdown()

  expect(res.status).toBe(200)
  expect(res.body).toBe('root|parent-meta|sibling-meta|module')
})

test('when all levels of middleware are defined (ws)', async () => {
  const ctx = await Context.create(import.meta.dirname, {
    middleware: [
      (_req, res, next) => next({
        ...res,
        list: ['root'],
      }),
    ],
  })

  const res = await ctx.sendMessage('GET', '/users')

  await ctx.shutdown()

  expect(res.status).toBe(200)
  expect(res.body).toBe('root|parent-meta|sibling-meta|module')
})
