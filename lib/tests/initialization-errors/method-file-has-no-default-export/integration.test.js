import { createApp } from '../../../src'

import {
  test,
  expect,
} from 'bun:test'

test('when method file has no default export', async () => {
  const fn = () => createApp(3000, import.meta.dirname)

  await expect(fn).toThrow(new Error(`
No default export defined in:
${process.cwd()}/tests/initialization-errors/method-file-has-no-default-export/api/get.js
  `.trim()))
})
