import { test, expect } from 'bun:test'
import { Context } from '../../_helpers'

test('when method file has no default export', async () => {
  const fn = () => Context.create(import.meta.dirname)

  await expect(fn).toThrow(new Error(`
No default export defined in:
${process.cwd()}/server/tests/initialization-errors/method-file-has-no-default-export/api/get.js
  `.trim()))
})
