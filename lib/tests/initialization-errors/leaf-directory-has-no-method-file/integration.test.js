import {
  test,
  expect,
} from 'bun:test'

import { createApp } from '../../../src'

test('when leaf directory has no method file', async () => {
  const fn = () => createApp(3000, import.meta.dirname)

  await expect(fn).toThrow(new Error(`
Directory is a leaf, but doesn't contain a method file:
/Users/travistrue/code/sleepy-serv/lib/tests/initialization-errors/leaf-directory-has-no-method-file/api/users
  `.trim()))
})
