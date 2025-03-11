import { getPortCounter } from '../../_helpers'
import { createApp } from '../../../src'

import {
  test,
  expect,
} from 'bun:test'

test('when leaf directory has no method file', async () => {
  const port = getPortCounter()
  const fn = () => createApp(port, import.meta.dirname)

  await expect(fn).toThrow(new Error(`
Directory is a leaf, but doesn't contain a method file:
${process.cwd()}/tests/initialization-errors/leaf-directory-has-no-method-file/api/users
  `.trim()))
})
