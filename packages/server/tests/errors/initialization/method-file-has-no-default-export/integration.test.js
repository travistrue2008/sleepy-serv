import { test, expect } from 'bun:test'
import { createApp } from '../../../../src'

test('when method file has no default export', async () => {
  const fn = () => createApp(0, import.meta.dirname)

  /* eslint-disable max-len */
  await expect(fn).toThrow(new Error(`
No default export defined in:
${process.cwd()}/packages/server/tests/errors/initialization/method-file-has-no-default-export/api/get.js
  `.trim()))
  /* eslint-enable max-len */
})
