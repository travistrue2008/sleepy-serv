import { describe, test, expect } from 'bun:test'
import { FMT, Context } from '../../../helpers'
import { NotFoundError, UnprocessableContentError } from '../../../../src'

const CLIENT_ID_INVALID = 'client-invalid'
const TICKET_INVALID = 'ticket-invalid'

describe('POST', () => {
  test('when requested (REST)', async () => {
    const ctx = await Context.create(import.meta.dirname)
    const res = await ctx.makeRequest('/ws', FMT.JSON, { method: 'POST' })

    await ctx.shutdown()

    expect(res.status).toBe(200)

    expect(res.body).toStrictEqual({
      clientId: expect.any(String),
      ticket: expect.any(String),
      data: null,
    })
  })

  test('when requested (ws)', async () => {
    const ctx = await Context.create(import.meta.dirname)
    const res = await ctx.sendMessage('POST', '/ws')

    await ctx.shutdown()

    expect(res.status).toBe(UnprocessableContentError.status)

    expect(res.body).toStrictEqual([
      {
        path: '',
        message: 'must NOT be valid',
      },
    ])
  })
})

describe('PUT', () => {
  // test('when requested (REST)', async () => {
  //   const ctx = await Context.create(import.meta.dirname)

  //   const res = await ctx.makeRequest('/ws', FMT.JSON, {
  //     method: 'PUT',
  //     query: {
  //     },
  //   })

  //   await ctx.shutdown()

  //   expect(res.status).toBe(200)

  //   expect(res.body).toStrictEqual({
  //     clientId: expect.any(String),
  //     ticket: expect.any(String),
  //     data: null,
  //   })
  // })

  // test('when requested (ws)', async () => {
  //   const ctx = await Context.create(import.meta.dirname)
  //   const res = await ctx.sendMessage('POST', '/ws')

  //   await ctx.shutdown()

  //   expect(res.status).toBe(UnprocessableContentError.status)

  //   expect(res.body).toStrictEqual([
  //     {
  //       path: '',
  //       message: 'must NOT be valid',
  //     },
  //   ])
  // })
})

describe('GET', () => {
  test('when NO "ticket" querystring (REST)', async () => {
    const ctx = await Context.create(import.meta.dirname)
    const res = await ctx.makeRequest('/ws', FMT.JSON, { method: 'GET' })

    await ctx.shutdown()

    expect(res.status).toBe(UnprocessableContentError.status)

    expect(res.body).toStrictEqual([
      {
        path: 'query',
        message: `must have required property 'ticket'`,
      },
    ])
  })

  test('when NO "ticket" querystring (ws)', async () => {
    const ctx = await Context.create(import.meta.dirname)
    const res = await ctx.sendMessage('GET', '/ws')

    await ctx.shutdown()

    expect(res.status).toBe(UnprocessableContentError.status)

    expect(res.body).toStrictEqual([
      {
        path: '',
        message: 'must NOT be valid',
      },
    ])
  })

  test('when invalid "ticket" querystring (REST)', async () => {
    const ctx = await Context.create(import.meta.dirname)

    const res = await ctx.makeRequest('/ws', FMT.JSON, {
      method: 'GET',
      query: {
        ticket: TICKET_INVALID,
      },
    })

    await ctx.shutdown()

    expect(res.status).toBe(NotFoundError.status)

    expect(res.body).toStrictEqual(null)
  })

  test('when invalid "ticket" querystring (ws)', async () => {
    const url = `/ws?ticket=${TICKET_INVALID}`
    const ctx = await Context.create(import.meta.dirname)
    const res = await ctx.sendMessage('GET', url)

    await ctx.shutdown()

    expect(res.status).toBe(UnprocessableContentError.status)

    expect(res.body).toStrictEqual([
      {
        path: '',
        message: 'must NOT be valid',
      },
    ])
  })

  test('when providing a "ticket" querystring (REST)', async () => {
    const ctx = await Context.create(import.meta.dirname)

    const { ticket } = await ctx.makeRequest('/ws', FMT.JSON, {
      method: 'POST',
    })

    const res = await ctx.makeRequest('/ws', FMT.JSON, {
      method: 'GET',
      query: { ticket },
    })

    await ctx.shutdown()

    expect(res.status).toBe(NotFoundError.status)

    expect(res.body).toStrictEqual(null)
  })

  test('when providing a "ticket" querystring (ws)', async () => {
    const ctx = await Context.create(import.meta.dirname)

    const { ticket } = await ctx.makeRequest('/ws', FMT.JSON, {
      method: 'POST',
    })

    const res = await ctx.sendMessage('GET', '/ws', {
      query: { ticket },
    })

    await ctx.shutdown()

    expect(res.status).toBe(UnprocessableContentError.status)

    expect(res.body).toStrictEqual([
      {
        path: '',
        message: 'must NOT be valid',
      },
    ])
  })
})
