import fs from 'fs'
import os from 'os'
import path from 'path'
import { describe, test, expect, beforeEach, afterEach } from 'bun:test'
import { init } from './init'

const BASE_DIR = path.join(os.tmpdir(), 'sleepy-serv')
const CLI_ENTRY = path.resolve(import.meta.dirname, 'index.ts')

// -- CLI dispatch

describe('CLI dispatch', () => {
  test('when called with no arguments', async () => {
    const proc = Bun.spawn(
      ['bun', CLI_ENTRY],
      {
        stdout: 'pipe',
        stderr: 'pipe',
      },
    )

    const exitCode = await proc.exited
    const stderr = await new Response(proc.stderr).text()

    expect(exitCode).toBe(1)
    expect(stderr).toContain('Usage:')
  })

  test('when called with an unknown command', async () => {
    const proc = Bun.spawn(
      ['bun', CLI_ENTRY, 'foo'],
      {
        stdout: 'pipe',
        stderr: 'pipe',
      },
    )

    const exitCode = await proc.exited

    expect(exitCode).toBe(1)
  })

  test('when called with --help', async () => {
    const proc = Bun.spawn(
      ['bun', CLI_ENTRY, '--help'],
      {
        stdout: 'pipe',
        stderr: 'pipe',
      },
    )

    const exitCode = await proc.exited
    const stdout = await new Response(proc.stdout).text()

    expect(exitCode).toBe(0)
    expect(stdout).toContain('Usage:')
  })
})

// -- init()

describe('init()', () => {
  let tempDir: string
  let origCwd: string

  beforeEach(() => {
    tempDir = path.join(BASE_DIR, `init-test-${crypto.randomUUID()}`)

    fs.mkdirSync(tempDir, { recursive: true })

    origCwd = process.cwd()

    process.chdir(tempDir)
  })

  afterEach(() => {
    process.chdir(origCwd)

    fs.rmSync(tempDir, {
      recursive: true,
      force: true,
    })
  })

  test('when run in a directory with existing src/', async () => {
    const srcDir = path.join(tempDir, 'src')

    fs.mkdirSync(srcDir, { recursive: true })
    fs.writeFileSync(path.join(srcDir, 'index.ts'), 'existing content')

    await init()

    const content = fs.readFileSync(path.join(srcDir, 'index.ts'), 'utf-8')

    expect(content).toBe('existing content')
  })

  test('when run in a directory with existing package.json', async () => {
    const existing = {
      name: 'my-app',
      version: '1.0.0',
      scripts: {
        test: 'bun test',
      },
    }

    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify(existing, null, 2) + '\n',
    )

    await init()

    const raw = fs.readFileSync(path.join(tempDir, 'package.json'), 'utf-8')
    const pkg = JSON.parse(raw)

    expect(pkg.name).toBe('my-app')

    expect(pkg.scripts).toStrictEqual({
      test: 'bun test',
      dev: 'sleepy dev',
      build: 'sleepy build',
    })
  })

  test('when run in an empty directory', async () => {
    await init()

    const EXPECTED_FILES = [
      'package.json',
      'sleepy.config.ts',
      'tsconfig.json',
      'src/index.ts',
      'src/api/get.ts',
    ]

    for (const file of EXPECTED_FILES) {
      const filePath = path.join(tempDir, file)

      expect(fs.existsSync(filePath)).toBe(true)
    }
  })
})
