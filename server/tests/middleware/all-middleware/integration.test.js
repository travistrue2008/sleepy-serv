import { test, expect, mock } from 'bun:test'
import { FMT, Context } from '../../_helpers'

test('when all levels of middleware are defined', async () => {
  const ctx = await Context.create(import.meta.dirname, {
    middleware: [
      (_req, res, next) => {
        res.list = ['root']

        return next()
      },
    ],
  })

  const res = await ctx.makeRequest('/users', FMT.TEXT)

  await ctx.shutdown()

  expect(res.status).toBe(200)
  expect(res.body).toBe('root|parent-meta|sibling-meta|module')
})

test('when all levels of socket middleware are defined', async () => {
  const ctx = await Context.create(import.meta.dirname, {
    middleware: [
      (_req, res, next) => {
        res.list = ['root']

        return next()
      },
    ],
  })

  const res = await ctx.sendMessage('GET', '/users')

  await ctx.shutdown()

  expect(res.status).toBe(200)
  expect(res.body).toBe('root|parent-meta|sibling-meta|module')
})
