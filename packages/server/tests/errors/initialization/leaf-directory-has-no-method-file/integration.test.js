import { test, expect } from 'bun:test'
import { createApp } from '../../../../src'

test('when leaf directory has no method file', async () => {
  const fn = () => createApp(0, import.meta.dirname)

  /* eslint-disable max-len */
  await expect(fn).toThrow(new Error(`
Directory is a leaf, but doesn't contain a method file:
${process.cwd()}/packages/server/tests/errors/initialization/leaf-directory-has-no-method-file/api/users
  `.trim()))
  /* eslint-enable max-len */
})
