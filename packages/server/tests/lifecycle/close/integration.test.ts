import { describe, test, expect, jest } from 'bun:test'
import { stdin } from 'node:process'
import { createApp } from '../../../src'

type MockStdin = {
  isTTY?: boolean
  setRawMode?: (mode: boolean) => void
}

function mockStdin (
  isTTY: boolean,
  setRawMode: (mode: boolean) => void,
): () => void {
  const mock = stdin as unknown as MockStdin
  const prevIsTTY = mock.isTTY
  const prevSetRawMode = mock.setRawMode

  mock.isTTY = isTTY
  mock.setRawMode = setRawMode

  return () => {
    mock.isTTY = prevIsTTY
    mock.setRawMode = prevSetRawMode
  }
}

describe('close()', () => {
  test('when the app is closed without a TTY', async () => {
    const onClose = jest.fn()
    const setRawMode = jest.fn()
    const restore = mockStdin(false, setRawMode)
    const before = stdin.isPaused()

    try {
      const app = await createApp(0, import.meta.dirname, { onClose })

      const during = stdin.isPaused()
      const origin = app.server.url.origin

      await app.close(true)

      const promise = fetch(origin)

      await expect(promise).rejects.toThrow()
      expect(during).toBe(before)
      expect(setRawMode).not.toHaveBeenCalled()
      expect(onClose).toHaveBeenCalledOnce()
    } finally {
      restore()
    }
  })

  test('when the app is closed with a TTY', async () => {
    const onClose = jest.fn()
    const setRawMode = jest.fn()
    const restore = mockStdin(true, setRawMode)

    try {
      const app = await createApp(0, import.meta.dirname, { onClose })

      const during = stdin.isPaused()

      await app.close(true)

      const after = stdin.isPaused()

      expect(during).toBe(false)
      expect(after).toBe(true)
      expect(setRawMode).toHaveBeenCalledWith(true)
      expect(setRawMode).toHaveBeenLastCalledWith(false)
      expect(onClose).toHaveBeenCalledOnce()
    } finally {
      restore()
    }
  })
})
