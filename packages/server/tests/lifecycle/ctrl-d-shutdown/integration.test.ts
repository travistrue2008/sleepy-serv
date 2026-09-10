import path from 'node:path'
import { test, expect } from 'bun:test'
import { createClient } from '../../helpers'

test('when the user presses Ctrl+D', async () => {
  const entry = path.join(import.meta.dirname, 'src', 'index.ts')

  let resolvePort: (port: number) => void
  let buffer = ''

  const portPromise = new Promise<number>((resolve) => {
    resolvePort = resolve
  })

  const terminal = new Bun.Terminal({
    data (_term, chunk) {
      buffer += new TextDecoder().decode(chunk)

      const match = buffer.match(/Running on port: (\d+)/)

      if (match) {
        resolvePort(Number.parseInt(match[1], 10))
      }
    },
  })

  const proc = Bun.spawn(
    ['bun', '--preload', 'sleepy-serv/plugin', entry],
    {
      terminal,
      cwd: import.meta.dirname,
    },
  )

  const port = await portPromise
  const reqClient = createClient({ port })

  terminal.write('\x04')

  const code = await proc.exited

  terminal.close()

  const promise = reqClient.get('/', null)

  expect(code).toBe(0)

  await expect(promise).rejects.toThrow(
    new TypeError(
      'Unable to connect. Is the computer able to access the url?',
    ),
  )
})
