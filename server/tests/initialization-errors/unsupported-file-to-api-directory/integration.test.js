import { test, expect } from 'bun:test'
import { Context } from '../../_helpers'

/* TODO: unskip after adding whitelist support */
test.skip('when an unsupported file is found in the /api directory', async () => {
  const fn = () => Context.create(import.meta.dirname)

  await expect(fn).toThrow(new Error(`
Directory contains illegal files:
${process.cwd()}/tests/initialization-errors/unsupported-file-to-api-directory/api
  `.trim()))
})
