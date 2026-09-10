import fs from 'fs'
import os from 'os'
import path from 'path'
import crypto from 'crypto'
import { scanRoutes } from './scanner'

import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
} from 'bun:test'

const META = 'export const middleware = []'
const HANDLER = 'export default () => new Response(`ok`)'
const SCRATCHPAD = path.join(os.tmpdir(), 'sleepy-serv/scanner-test')

function makeTempDir (): string {
  const id = crypto.randomUUID()
  const dir = path.join(SCRATCHPAD, id)

  fs.mkdirSync(dir, { recursive: true })

  return dir
}

function writeFixture (
  base: string,
  relativePath: string,
  content: string,
): string {
  const full = path.join(base, relativePath)

  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, content)

  return full
}

describe('scanRoutes()', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = makeTempDir()
  })

  afterEach(() => {
    fs.rmSync(tempDir, {
      recursive: true,
      force: true,
    })
  })

  test('when the api root does not exist', () => {
    const filename = `does-not-exist-${crypto.randomUUID()}`
    const fake = path.join(SCRATCHPAD, filename)
    const fn = () => scanRoutes(fake)

    expect(fn).toThrow(
      new Error(`ENOENT: no such file or directory, scandir '${fake}'`),
    )
  })

  test('when a leaf directory has no method file', () => {
    const apiRoot = path.join(tempDir, 'api')

    fs.mkdirSync(apiRoot, { recursive: true })

    const usersDir = path.join(apiRoot, 'users')

    fs.mkdirSync(usersDir, { recursive: true })
    writeFixture(usersDir, 'meta.ts', META)

    const fn = () => scanRoutes(apiRoot)

    expect(fn).toThrow(TypeError)
  })

  test('when scanning a flat api directory', () => {
    const apiRoot = path.join(tempDir, 'api')

    fs.mkdirSync(apiRoot, { recursive: true })

    const modulePath = writeFixture(apiRoot, 'get.ts', HANDLER)
    const result = scanRoutes(apiRoot)

    expect(result.methods).toStrictEqual([
      {
        method: 'GET',
        path: '/',
        modulePath,
      },
    ])

    expect(result.meta).toStrictEqual([])
  })

  test('when scanning nested directories', () => {
    const apiRoot = path.join(tempDir, 'api')

    fs.mkdirSync(apiRoot, { recursive: true })
    writeFixture(apiRoot, 'get.ts', HANDLER)

    const modulePath = writeFixture(apiRoot, 'users/:userId/get.ts', HANDLER)
    const result = scanRoutes(apiRoot)
    const nested = result.methods.find(mod => mod.modulePath === modulePath)

    expect(nested).toStrictEqual({
      method: 'GET',
      path: '/users/:userId',
      modulePath,
    })
  })

  test('when a directory has a colon prefix', () => {
    const apiRoot = path.join(tempDir, 'api')

    fs.mkdirSync(apiRoot, { recursive: true })
    writeFixture(apiRoot, 'get.ts', HANDLER)

    const modulePath = writeFixture(apiRoot, 'items/:itemId/get.ts', HANDLER)
    const result = scanRoutes(apiRoot)
    const entry = result.methods.find(mod => mod.modulePath === modulePath)

    expect(entry).toBeDefined()
    expect(entry!.path).toBe('/items/:itemId')
  })

  test('when scanning finds meta.ts files', () => {
    const apiRoot = path.join(tempDir, 'api')

    fs.mkdirSync(apiRoot, { recursive: true })
    writeFixture(apiRoot, 'get.ts', HANDLER)

    const metaPath = writeFixture(apiRoot, 'meta.ts', META)
    const result = scanRoutes(apiRoot)

    expect(result.meta).toStrictEqual([
      {
        path: '/',
        modulePath: metaPath,
      },
    ])
  })

  test('when files have .js extensions', () => {
    const apiRoot = path.join(tempDir, 'api')

    fs.mkdirSync(apiRoot, { recursive: true })

    const modulePath = writeFixture(apiRoot, 'get.js', HANDLER)
    const result = scanRoutes(apiRoot)

    expect(result.methods).toStrictEqual([
      {
        method: 'GET',
        path: '/',
        modulePath,
      },
    ])
  })

  test('when non-method files exist', () => {
    const apiRoot = path.join(tempDir, 'api')

    fs.mkdirSync(apiRoot, { recursive: true })

    const modulePath = writeFixture(apiRoot, 'get.ts', HANDLER)

    writeFixture(apiRoot, 'utils.ts', 'export const x = 1')

    const result = scanRoutes(apiRoot)

    expect(result.methods).toStrictEqual([
      {
        method: 'GET',
        path: '/',
        modulePath,
      },
    ])

    expect(result.meta).toStrictEqual([])
  })
})
