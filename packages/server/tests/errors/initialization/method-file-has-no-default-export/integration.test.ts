import { test, expect } from 'bun:test'
import { createServer } from '../../../helpers'

test('when method file has no default export', async () => {
  const promise = createServer(import.meta.dirname)

  await expect(promise).rejects.toThrow(
    new Error(
      'Server process exited with code 1'
      + ' before printing a port.',
    ),
  )
})
