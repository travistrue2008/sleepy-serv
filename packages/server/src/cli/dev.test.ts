import fs from 'fs'
import os from 'os'
import path from 'path'
import { StatusCode } from '../core/utils'
import { Fmt, createClient } from '../../tests/helpers'

import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
} from 'bun:test'

const IS_CI = process.env.CI === 'true'
const BASE_DIR = path.join(os.tmpdir(), 'sleepy-serv')
const PKG_ROOT = path.resolve(import.meta.dirname, '../..')
const CLI_ENTRY = path.resolve(import.meta.dirname, 'index.ts')

function linkSleepyServ (dir: string): void {
  const nodeModules = path.join(dir, 'node_modules')

  fs.mkdirSync(nodeModules, { recursive: true })

  fs.symlinkSync(
    PKG_ROOT,
    path.join(nodeModules, 'sleepy-serv'),
  )
}

function writeApp (dir: string): void {
  const srcDir = path.join(dir, 'src')
  const apiDir = path.join(srcDir, 'api')

  fs.mkdirSync(apiDir, { recursive: true })

  fs.writeFileSync(
    path.join(srcDir, 'index.ts'),
    `
import { createApp } from 'sleepy-serv'

createApp(0)
    `.trim().concat('\n'),
  )

  fs.writeFileSync(
    path.join(apiDir, 'get.ts'),
    'export default () => Response.json({ ok: true })',
  )
}

describe('dev()', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = path.join(BASE_DIR, `dev-test-${crypto.randomUUID()}`)

    fs.mkdirSync(tempDir, { recursive: true })
  })

  afterEach(() => {
    fs.rmSync(tempDir, {
      recursive: true,
      force: true,
    })
  })

  test('when the entrypoint does not exist', async () => {
    const proc = Bun.spawn(['bun', CLI_ENTRY, 'dev'], {
      cwd: tempDir,
      stdout: 'pipe',
      stderr: 'pipe',
    })

    const code = await proc.exited
    const stderr = await new Response(proc.stderr).text()

    expect(code).not.toBe(0)
    expect(stderr).toContain('Entrypoint not found')
  })

  test.skipIf(IS_CI)('when the server crashes on startup', async () => {
    const srcDir = path.join(tempDir, 'src')

    fs.mkdirSync(srcDir, { recursive: true })

    fs.writeFileSync(
      path.join(srcDir, 'index.ts'),
      'throw new Error(\'boom\')\n',
    )

    const proc = Bun.spawn(['bun', CLI_ENTRY, 'dev'], {
      cwd: tempDir,
      stdout: 'pipe',
      stderr: 'pipe',
    })

    const code = await proc.exited

    expect(code).not.toBe(0)
  })

  test('when the server starts successfully', async () => {
    linkSleepyServ(tempDir)
    writeApp(tempDir)

    const proc = Bun.spawn(['bun', CLI_ENTRY, 'dev'], {
      cwd: tempDir,
      stdout: 'pipe',
      stderr: 'pipe',
    })

    const reader = proc.stdout.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let port = 0

    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })

      const match = buffer.match(/Running on port: (\d+)/)

      if (match) {
        port = Number.parseInt(match[1], 10)

        break
      }
    }

    const reqClient = createClient({ port })
    const result = await reqClient.get('/', Fmt.Json)

    proc.kill()
    await proc.exited

    expect(port).toBeGreaterThan(0)
    expect(result.status).toBe(StatusCode.Ok)
    expect(result.body).toStrictEqual({ ok: true })
  })

  test('when a custom entrypoint is configured', async () => {
    linkSleepyServ(tempDir)

    const customDir = path.join(tempDir, 'app')
    const apiDir = path.join(customDir, 'api')

    fs.mkdirSync(apiDir, { recursive: true })

    fs.writeFileSync(
      path.join(customDir, 'main.ts'),
      `
import { createApp } from 'sleepy-serv'

createApp(0)
      `.trim().concat('\n'),
    )

    fs.writeFileSync(
      path.join(apiDir, 'get.ts'),
      'export default () => Response.json({ custom: true })',
    )

    fs.writeFileSync(
      path.join(tempDir, 'sleepy.config.ts'),
      `
export default {
  app: {
    root: './app/api',
    entrypoint: './app/main.ts',
  },
}
      `.trim().concat('\n'),
    )

    const proc = Bun.spawn(['bun', CLI_ENTRY, 'dev'], {
      cwd: tempDir,
      stdout: 'pipe',
      stderr: 'pipe',
    })

    const reader = proc.stdout.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let port = 0

    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })

      const match = buffer.match(/Running on port: (\d+)/)

      if (match) {
        port = Number.parseInt(match[1], 10)

        break
      }
    }

    const reqClient = createClient({ port })
    const result = await reqClient.get('/', Fmt.Json)

    proc.kill()
    await proc.exited

    expect(port).toBeGreaterThan(0)
    expect(result.status).toBe(StatusCode.Ok)
    expect(result.body).toStrictEqual({ custom: true })
  })

  test('when a source file changes', async () => {
    linkSleepyServ(tempDir)
    writeApp(tempDir)

    const proc = Bun.spawn(['bun', CLI_ENTRY, 'dev'], {
      cwd: tempDir,
      stdout: 'pipe',
      stderr: 'pipe',
    })

    const handlerPath = path.join(tempDir, 'src', 'api', 'get.ts')
    const reader = proc.stdout.getReader()
    const decoder = new TextDecoder()

    let buffer = ''
    let portCount = 0
    let lastPort = 0

    const waitForPort = async (): Promise<number> => {
      while (true) {
        const { done, value } = await reader.read()

        if (done) {
          return 0
        }

        buffer += decoder.decode(value, { stream: true })

        const matches = buffer.match(/Running on port: (\d+)/g)

        if (matches && matches.length > portCount) {
          portCount = matches.length

          const latest = matches[matches.length - 1]
          const port = Number.parseInt(latest.split(': ')[1], 10)

          return port
        }
      }
    }

    lastPort = await waitForPort()

    expect(lastPort).toBeGreaterThan(0)

    fs.writeFileSync(
      handlerPath,
      'export default () => Response.json({ reloaded: true })',
    )

    const newPort = await waitForPort()
    const reqClient = createClient({ port: newPort })
    const result = await reqClient.get('/', Fmt.Json)

    proc.kill()
    await proc.exited

    expect(newPort).toBeGreaterThan(0)
    expect(result.status).toBe(StatusCode.Ok)
    expect(result.body).toStrictEqual({ reloaded: true })
  })
})
