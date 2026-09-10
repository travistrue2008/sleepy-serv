import { test, expect } from 'bun:test'
import { createServer } from '../../../helpers'

test('when leaf directory has no method file', async () => {
  const promise = createServer(import.meta.dirname)

  await expect(promise).rejects.toThrow()
})
