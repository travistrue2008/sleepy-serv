import fs from 'fs'
import os from 'os'
import path from 'path'
import { build } from './build'

import {
  describe,
  test,
  expect,
  spyOn,
  mock,
  beforeEach,
  afterEach,
} from 'bun:test'

const BASE_DIR = path.join(os.tmpdir(), 'sleepy-serv')
const PKG_ROOT = path.resolve(import.meta.dirname, '../..')

describe('build()', () => {
  let tempDir: string
  let origCwd: string

  const exitSpy = spyOn(process, 'exit')
  const errorSpy = spyOn(console, 'error')

  function makeTempDir (): void {
    const filename = `build-test-${crypto.randomUUID()}`

    tempDir = path.join(BASE_DIR, filename)

    fs.mkdirSync(tempDir, { recursive: true })

    origCwd = process.cwd()
  }

  function linkSleepyServ (): void {
    const nodeModules = path.join(tempDir, 'node_modules')

    fs.mkdirSync(nodeModules, { recursive: true })

    fs.symlinkSync(
      PKG_ROOT,
      path.join(nodeModules, 'sleepy-serv'),
    )
  }

  function writeEntrypoint (): void {
    const srcDir = path.join(tempDir, 'src')

    fs.mkdirSync(srcDir, { recursive: true })

    fs.writeFileSync(
      path.join(srcDir, 'index.ts'),
      `
import { createApp } from 'sleepy-serv'

const app = createApp(3000)
      `.trim().concat('\n'),
    )
  }

  function writeRoute (): void {
    const apiDir = path.join(tempDir, 'src', 'api')

    fs.mkdirSync(apiDir, { recursive: true })

    fs.writeFileSync(
      path.join(apiDir, 'get.ts'),
      'export default () => Response.json({ ok: true })',
    )
  }

  beforeEach(() => {
    makeTempDir()

    exitSpy.mockImplementation(() => {
      throw new Error('process.exit')
    })

    errorSpy.mockImplementation(() => {})
  })

  afterEach(() => {
    process.chdir(origCwd)
    mock.restore()

    fs.rmSync(tempDir, {
      recursive: true,
      force: true,
    })
  })

  test('when the entrypoint does not exist', async () => {
    const indexFilePath = path.resolve(import.meta.dirname, 'index.ts')

    const proc = Bun.spawn(['bun', indexFilePath, 'build'], {
      cwd: tempDir,
      stdout: 'pipe',
      stderr: 'pipe',
    })

    const code = await proc.exited
    const stderr = await new Response(proc.stderr).text()

    expect(code).not.toBe(0)
    expect(stderr).toContain('Entrypoint not found')
  })

  test('when the scanner throws', async () => {
    linkSleepyServ()
    writeEntrypoint()

    const indexFilePath = path.resolve(import.meta.dirname, 'index.ts')
    const usersDir = path.join(tempDir, 'src', 'api', 'users')

    fs.mkdirSync(usersDir, { recursive: true })

    fs.writeFileSync(
      path.join(usersDir, 'meta.ts'),
      'export const middleware = []\n',
    )

    const proc = Bun.spawn(['bun', indexFilePath, 'build'], {
      cwd: tempDir,
      stdout: 'pipe',
      stderr: 'pipe',
    })

    const code = await proc.exited
    const stderr = await new Response(proc.stderr).text()

    expect(code).not.toBe(0)
    expect(stderr).toContain('Build failed')
  })

  test('when run with default config', async () => {
    linkSleepyServ()
    writeEntrypoint()
    writeRoute()

    process.chdir(tempDir)
    mock.restore()

    await build()

    const distDir = path.join(tempDir, 'dist')
    const outputs = fs.readdirSync(distDir)

    expect(fs.existsSync(distDir)).toBe(true)
    expect(outputs.length).toBeGreaterThan(0)
  })

  test('when compile is true', async () => {
    linkSleepyServ()
    writeEntrypoint()
    writeRoute()

    fs.writeFileSync(
      path.join(tempDir, 'sleepy.config.ts'),
      `
export default {
  build: {
    compile: true,
  },
}
      `.trim().concat('\n'),
    )

    process.chdir(tempDir)
    mock.restore()

    await build()

    const distDir = path.join(tempDir, 'dist')
    const outputs = fs.readdirSync(distDir)

    expect(fs.existsSync(distDir)).toBe(true)
    expect(outputs.length).toBeGreaterThan(0)
  })

  test('when bytecode is true', async () => {
    linkSleepyServ()
    writeEntrypoint()
    writeRoute()

    fs.writeFileSync(
      path.join(tempDir, 'sleepy.config.ts'),
      `
export default {
  build: {
    bytecode: true,
  },
}
      `.trim().concat('\n'),
    )

    process.chdir(tempDir)
    mock.restore()

    await build()

    const distDir = path.join(tempDir, 'dist')
    const outputs = fs.readdirSync(distDir)

    expect(fs.existsSync(distDir)).toBe(true)
    expect(outputs.length).toBeGreaterThan(0)
  })

  test('when compile and bytecode are both true', async () => {
    linkSleepyServ()
    writeEntrypoint()
    writeRoute()

    fs.writeFileSync(
      path.join(tempDir, 'sleepy.config.ts'),
      `
export default {
  build: {
    compile: true,
    bytecode: true,
  },
}
      `.trim().concat('\n'),
    )

    process.chdir(tempDir)
    mock.restore()

    await build()

    const distDir = path.join(tempDir, 'dist')
    const outputs = fs.readdirSync(distDir)

    expect(fs.existsSync(distDir)).toBe(true)
    expect(outputs.length).toBeGreaterThan(0)
  })

  test('when additional plugins are provided', async () => {
    linkSleepyServ()
    writeEntrypoint()
    writeRoute()

    fs.writeFileSync(
      path.join(tempDir, 'sleepy.config.ts'),
      `
export default {
  build: {
    plugins: [{
      name: \'test-plugin\',
      setup () {},
    }],
  },
}
      `.trim().concat('\n'),
    )

    process.chdir(tempDir)
    mock.restore()

    await build()

    const distDir = path.join(tempDir, 'dist')
    const outputs = fs.readdirSync(distDir)

    expect(fs.existsSync(distDir)).toBe(true)
    expect(outputs.length).toBeGreaterThan(0)
  })

  test('when custom outdir is set', async () => {
    linkSleepyServ()
    writeEntrypoint()
    writeRoute()
    mock.restore()

    fs.writeFileSync(
      path.join(tempDir, 'sleepy.config.ts'),
      `
export default {
  build: {
    outdir: \'./custom-out\',
  },
}
      `.trim().concat('\n'),
    )

    process.chdir(tempDir)
    await build()

    const customDir = path.join(tempDir, 'custom-out')
    const outputs = fs.readdirSync(customDir)

    expect(fs.existsSync(customDir)).toBe(true)
    expect(outputs.length).toBeGreaterThan(0)
  })

  test('when a scaffolded project builds', async () => {
    const indexFilePath = path.resolve(import.meta.dirname, 'index.ts')

    const proc = Bun.spawn(['bun', indexFilePath, 'init'], {
      cwd: tempDir,
      stdout: 'pipe',
      stderr: 'pipe',
    })

    await proc.exited

    linkSleepyServ()

    const buildProc = Bun.spawn(['bun', indexFilePath, 'build'], {
      cwd: tempDir,
      stdout: 'pipe',
      stderr: 'pipe',
    })

    const code = await buildProc.exited
    const stdout = await new Response(buildProc.stdout).text()

    expect(code).toBe(0)
    expect(stdout).toContain('Build succeeded')
  })
})
