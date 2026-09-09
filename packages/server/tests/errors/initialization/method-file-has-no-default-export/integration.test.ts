import { test, expect } from 'bun:test'
import { createApp } from '../../../../src'

test('when method file has no default export', () => {
  const fn = () => createApp(0)

  /* eslint-disable max-len */
  expect(fn).toThrow(new Error(`
No default export defined in:
${process.cwd()}/packages/server/tests/errors/initialization/method-file-has-no-default-export/api/get.ts
  `.trim()))
  /* eslint-enable max-len */
})
