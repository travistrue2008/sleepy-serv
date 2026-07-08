import { test, expect } from 'bun:test'
import { Context } from '../../_helpers'

test('when the "/ws" route is defined', async () => {
  const fn = () => Context.create(import.meta.dirname)

  await expect(fn).toThrow(new Error(`
Illegal directory:
${process.cwd()}/server/tests/initialization-errors/user-defined-ws-route/api/ws

This is a reserved directory.
  `.trim()))
})
