import {
  test,
  expect,
} from 'bun:test'

import { createApp } from '../../../src'

test('when method file has no default export', async () => {
  const fn = () => createApp(3000, import.meta.dirname)

  await expect(fn).toThrow(new Error(`
Directory contains illegal files:
/Users/travistrue/code/sleepy-serv/lib/tests/initialization-errors/unsupported-file-to-api-directory/api
  `.trim()))
})
