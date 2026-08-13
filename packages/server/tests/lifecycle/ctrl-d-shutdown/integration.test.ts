import { test, expect } from 'bun:test'
import path from 'node:path'

test('when the user presses Ctrl+D', async () => {
  const entry = path.join(import.meta.dirname, 'app.ts')

  let buffer = ''
  let resolvePort: (port: number) => void

  const portPromise = new Promise<number>((resolve) => {
    resolvePort = resolve
  })

  const terminal = new Bun.Terminal({
    data (_term, chunk) {
      buffer += new TextDecoder().decode(chunk)

      const match = buffer.match(/PORT:(\d+)/)

      if (match) {
        resolvePort(Number.parseInt(match[1], 10))
      }
    },
  })

  try {
    const proc = Bun.spawn(['bun', 'run', entry], { terminal })
    const port = await portPromise

    terminal.write('\x04')

    const code = await proc.exited
    const promise = fetch(`http://localhost:${port}`)

    expect(code).toBe(0)
    await expect(promise).rejects.toThrow()
  } finally {
    terminal.close()
  }
})
