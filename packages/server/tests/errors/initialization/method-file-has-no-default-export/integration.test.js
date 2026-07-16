import { test, expect } from 'bun:test'
import { Context } from '../../../helpers'

test('when method file has no default export', async () => {
  const fn = () => Context.create(import.meta.dirname)

  /* eslint-disable max-len */
  await expect(fn).toThrow(new Error(`
No default export defined in:
${process.cwd()}/packages/server/tests/errors/initialization/method-file-has-no-default-export/api/get.js
  `.trim()))
  /* eslint-enable max-len */
})
