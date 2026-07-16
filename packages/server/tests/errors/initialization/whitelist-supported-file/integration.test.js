import { test, expect } from 'bun:test'
import { createApp } from '../../../../src'

test('when an unsupported file is found in the /api directory', async () => {
  const fn = () => createApp(0, import.meta.dirname, {
    whitelist: ['**/*.util.js'],
  })

  await expect(fn).not.toThrow(new Error(`
Directory contains illegal files:
${process.cwd()}/tests/errors/initialization/whitelist-supported-file/api
  `.trim()))
})
