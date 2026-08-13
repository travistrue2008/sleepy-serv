import { describe, test, expect, jest } from 'bun:test'
import { stdin } from 'node:process'
import { createApp } from '../../../src'

type MockStdin = {
  isTTY?: boolean
}

function mockStdin (isTTY: boolean): () => void {
  const mock = stdin as unknown as MockStdin
  const prevIsTTY = mock.isTTY

  mock.isTTY = isTTY

  return () => {
    mock.isTTY = prevIsTTY
  }
}

describe('close()', () => {
  test('when the app is closed without a TTY', async () => {
    const onClose = jest.fn()
    const restore = mockStdin(false)

    try {
      const app = await createApp(0, import.meta.dirname, { onClose })
      const origin = app.server.url.origin

      await app.close(true)

      const promise = fetch(origin)

      await expect(promise).rejects.toThrow()
      expect(onClose).toHaveBeenCalledOnce()
    } finally {
      restore()
    }
  })

  test('when the app is closed with a TTY', async () => {
    const onClose = jest.fn()
    const restore = mockStdin(true)

    try {
      const app = await createApp(0, import.meta.dirname, { onClose })
      const origin = app.server.url.origin

      await app.close(true)

      const promise = fetch(origin)

      await expect(promise).rejects.toThrow()
      expect(onClose).toHaveBeenCalledOnce()
    } finally {
      restore()
    }
  })
})
