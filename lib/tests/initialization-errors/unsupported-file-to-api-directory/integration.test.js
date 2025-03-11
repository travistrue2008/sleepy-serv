import { getPortCounter } from '../../_helpers'
import { createApp } from '../../../src'

import {
  test,
  expect,
} from 'bun:test'

test('when an unsupported file is found in the /api directory', async () => {
  const port = getPortCounter()
  const fn = () => createApp(port, import.meta.dirname)

  await expect(fn).toThrow(new Error(`
Directory contains illegal files:
${process.cwd()}/tests/initialization-errors/unsupported-file-to-api-directory/api
  `.trim()))
})
