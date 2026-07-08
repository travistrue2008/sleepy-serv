import { test, expect } from 'bun:test'
import { Context } from '../../_helpers'

test('when an unsupported file is found in the /api directory', async () => {
  const fn = () => Context.create(import.meta.dirname, {
    whitelist: ['**/*.util.js'],
  })

  await expect(fn).not.toThrow(new Error(`
Directory contains illegal files:
${process.cwd()}/tests/initialization-errors/whitelist-supported-file/api
  `.trim()))
})
