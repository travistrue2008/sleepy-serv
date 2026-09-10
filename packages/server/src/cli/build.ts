import fs from 'fs'
import path from 'path'
import { loadConfig } from '../plugin/config'
import { scanRoutes } from '../plugin/scanner'
import { generateBarrelModule } from '../plugin/codegen'

import type { BunPlugin } from 'bun'

function resolveCompileOption (
  compile: boolean | string | undefined,
): { outfile: string } | undefined {
  if (!compile) {
    return undefined
  }

  if (typeof compile === 'string') {
    return { outfile: compile }
  }

  try {
    const raw = fs.readFileSync('package.json', 'utf-8')
    const pkg = JSON.parse(raw)

    if (pkg.name) {
      return { outfile: pkg.name }
    }
  } catch {}

  return { outfile: 'api' }
}

export async function build (): Promise<void> {
  const config = await loadConfig()
  const entrypoint = config.app?.entrypoint ?? './src/index.ts'

  if (!fs.existsSync(entrypoint)) {
    console.error(`Entrypoint not found: ${entrypoint}`)
    process.exit(1)
  }

  const relativeRoot = config.app?.root ?? './src/api'
  const apiRoot = path.resolve(process.cwd(), relativeRoot)
  const barrelPath = require.resolve('sleepy-serv')
  const escaped = barrelPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const constraints = { filter: new RegExp(escaped) }

  const sleepyPlugin: BunPlugin = {
    name: 'sleepy-serv',
    setup (build) {
      build.onLoad(constraints, () => {
        const scanResult = scanRoutes(apiRoot)
        const contents = generateBarrelModule(scanResult)

        return {
          loader: 'ts',
          contents,
        }
      })
    },
  }

  const userPlugins = (config.build?.plugins ?? []) as BunPlugin[]
  const outdir = config.build?.outdir ?? './dist'

  try {
    const result = await Bun.build({
      outdir,
      target: 'bun',
      minify: true,
      bytecode: config.build?.bytecode || undefined,
      compile: resolveCompileOption(config.build?.compile),
      plugins: [...userPlugins, sleepyPlugin],
      entrypoints: [entrypoint],
    })

    if (!result.success) {
      console.error('Build failed:')

      for (const log of result.logs) {
        console.error(`  ${log.message}`)
      }

      process.exit(1)
    }

    console.log('Build succeeded:')

    for (const output of result.outputs) {
      console.log(`  ${output.path}`)
    }
  } catch (err) {
    const errors = err instanceof AggregateError ? err.errors : [err]

    console.error('Build failed:')

    for (const buildErr of errors) {
      const isBasicErr = buildErr instanceof Error
      const msg = isBasicErr ? buildErr.message : String(buildErr)

      console.error(`  ${msg}`)
    }

    process.exit(1)
  }
}
