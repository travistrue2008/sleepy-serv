import { createApp } from '../../../src'

import {
  test,
  expect,
} from 'bun:test'

test('when an unsupported file is found in the /api directory', async () => {
  const fn = () => createApp(3000, import.meta.dirname)

  await expect(fn).toThrow(new Error(`
Directory contains illegal files:
${process.cwd()}/tests/initialization-errors/unsupported-file-to-api-directory/api
  `.trim()))
})
