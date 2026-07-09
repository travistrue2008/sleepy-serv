import { test, expect } from 'bun:test'
import { Context } from '../../_helpers'

/* TODO: unskip after adding whitelist support */
test.skip('when an unsupported file is found in /api', async () => {
  const fn = () => Context.create(import.meta.dirname)

  /* eslint-disable max-len */
  await expect(fn).toThrow(new Error(`
Directory contains illegal files:
${process.cwd()}/packages/server/tests/initialization-errors/unsupported-file-to-api-directory/api
  `.trim()))
  /* eslint-enable max-len */
})
