import fs from 'fs'
import os from 'os'
import path from 'path'
import { loadConfig } from './config'

import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
} from 'bun:test'

import type { SleepyConfig } from './config'

const TMP_ROOT = path.join(os.tmpdir(), 'sleepy-serv')

function makeTempDir (): string {
  const dir = path.join(TMP_ROOT, `config-test-${crypto.randomUUID()}`)

  fs.mkdirSync(dir, { recursive: true })

  return dir
}

describe('loadConfig()', () => {
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

  test('when no config file exists', async () => {
    const result = await loadConfig(tempDir)

    expect(result).toStrictEqual({})
  })

  test('when sleepy.config.ts exists', async () => {
    const configPath = path.join(tempDir, 'sleepy.config.ts')

    fs.writeFileSync(configPath, `
export default {
  app: { root: \'./api\' },
}
    `.trim().concat('\n'))

    const result = await loadConfig(tempDir)

    expect(result).toStrictEqual({
      app: { root: './api' },
    })
  })

  test('when sleepy.config.js exists', async () => {
    const configPath = path.join(tempDir, 'sleepy.config.js')

    fs.writeFileSync(configPath, `
module.exports = {
  app: { root: \'./js-api\' },
}
    `.trim().concat('\n'))

    const result = await loadConfig(tempDir)

    expect(result).toStrictEqual({
      app: { root: './js-api' },
    })
  })

  test('when both .ts and .js exist', async () => {
    const tsPath = path.join(tempDir, 'sleepy.config.ts')
    const jsPath = path.join(tempDir, 'sleepy.config.js')

    fs.writeFileSync(tsPath, `
export default {
  app: { root: \'./from-ts\' },
}
    `.trim().concat('\n'))

    fs.writeFileSync(jsPath, `
module.exports = {
  app: { root: \'./from-js\' },
}
    `.trim().concat('\n'))

    const result = await loadConfig(tempDir)

    expect(result).toStrictEqual({
      app: { root: './from-ts' },
    })
  })

  test('when config is an empty object', async () => {
    const configPath = path.join(tempDir, 'sleepy.config.ts')

    fs.writeFileSync(configPath, 'export default {}')

    const result: SleepyConfig = await loadConfig(tempDir)

    expect(result.app).toBeUndefined()
    expect(result.build).toBeUndefined()
  })

  test('when config.app is an empty object', async () => {
    const configPath = path.join(tempDir, 'sleepy.config.ts')

    fs.writeFileSync(configPath, 'export default { app: {} }')

    const result = await loadConfig(tempDir)

    expect(result.app).toStrictEqual({})
    expect(result.app?.root).toBeUndefined()
    expect(result.app?.entrypoint).toBeUndefined()
  })

  test('when config.app.root is "./custom/api"', async () => {
    const configPath = path.join(tempDir, 'sleepy.config.ts')

    fs.writeFileSync(configPath, `
export default {
  app: { root: \'./custom/api\' },
}
    `.trim().concat('\n'))

    const result = await loadConfig(tempDir)

    expect(result.app?.root).toBe('./custom/api')
    expect(result.app?.entrypoint).toBeUndefined()
  })

  test('when config.app.entrypoint is "./custom/index.ts"', async () => {
    const configPath = path.join(tempDir, 'sleepy.config.ts')

    fs.writeFileSync(configPath, `
export default {
  app: {
    entrypoint: \'./custom/index.ts\',
  },
}
      `.trim().concat('\n'))

    const result = await loadConfig(tempDir)

    expect(result.app?.entrypoint).toBe('./custom/index.ts')
    expect(result.app?.root).toBeUndefined()
  },
  )

  test('when config.build is an empty object', async () => {
    const configPath = path.join(tempDir, 'sleepy.config.ts')

    fs.writeFileSync(configPath, 'export default { build: {} }')

    const result = await loadConfig(tempDir)

    expect(result.build).toStrictEqual({})
    expect(result.build?.compile).toBeUndefined()
    expect(result.build?.bytecode).toBeUndefined()
    expect(result.build?.outdir).toBeUndefined()
    expect(result.build?.plugins).toBeUndefined()
  })

  test('when config.build.compile is true', async () => {
    const configPath = path.join(tempDir, 'sleepy.config.ts')

    fs.writeFileSync(configPath, `
export default {
  build: { compile: true },
}
    `.trim().concat('\n'))

    const result = await loadConfig(tempDir)

    expect(result.build?.compile).toBe(true)
    expect(result.build?.bytecode).toBeUndefined()
    expect(result.build?.outdir).toBeUndefined()
    expect(result.build?.plugins).toBeUndefined()
  })

  test('when config.build.bytecode is true', async () => {
    const configPath = path.join(tempDir, 'sleepy.config.ts')

    fs.writeFileSync(configPath, `
export default {
  build: { bytecode: true },
}
    `.trim().concat('\n'))

    const result = await loadConfig(tempDir)

    expect(result.build?.bytecode).toBe(true)
    expect(result.build?.compile).toBeUndefined()
    expect(result.build?.outdir).toBeUndefined()
    expect(result.build?.plugins).toBeUndefined()
  })

  test('when config.build.outdir is "./custom/dist"', async () => {
    const configPath = path.join(tempDir, 'sleepy.config.ts')

    fs.writeFileSync(configPath, `
export default {
  build: { outdir: \'./custom/dist\' },
}
    `.trim().concat('\n'))

    const result = await loadConfig(tempDir)

    expect(result.build?.outdir).toBe('./custom/dist')
    expect(result.build?.outdir).toBe('./custom/dist')
    expect(result.build?.compile).toBeUndefined()
    expect(result.build?.bytecode).toBeUndefined()
    expect(result.build?.plugins).toBeUndefined()
  })

  test('when config.build.plugins is [customPlugin]', async () => {
    const configPath = path.join(tempDir, 'sleepy.config.ts')

    fs.writeFileSync(configPath, `
const customPlugin = {
  name: \'custom\',
  setup () {},
}

export default {
  build: { plugins: [customPlugin] },
}
    `.trim().concat('\n'))

    const result = await loadConfig(tempDir)

    expect(result.build?.plugins).toStrictEqual([{
      name: 'custom',
      setup: expect.any(Function),
    }])

    expect(result.build?.compile).toBeUndefined()
    expect(result.build?.bytecode).toBeUndefined()
    expect(result.build?.outdir).toBeUndefined()
  })
})
