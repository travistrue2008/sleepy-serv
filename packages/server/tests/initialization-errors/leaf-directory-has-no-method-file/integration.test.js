import { test, expect } from 'bun:test'
import { Context } from '../../_helpers'

test('when leaf directory has no method file', async () => {
  const fn = () => Context.create(import.meta.dirname)

  /* eslint-disable max-len */
  await expect(fn).toThrow(new Error(`
Directory is a leaf, but doesn't contain a method file:
${process.cwd()}/packages/server/tests/initialization-errors/leaf-directory-has-no-method-file/api/users
  `.trim()))
  /* eslint-enable max-len */
})
