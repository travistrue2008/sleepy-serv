import fs from 'fs'
import { loadConfig } from '../plugin/config'

async function run (watch: boolean): Promise<void> {
  const config = await loadConfig()
  const entrypoint = config.app?.entrypoint ?? './src/index.ts'

  if (!fs.existsSync(entrypoint)) {
    console.error(`Entrypoint not found: ${entrypoint}`)

    process.exit(1)
  }

  const proc = Bun.spawn([
    'bun', watch ? '--watch' : '',
    '--preload', 'sleepy-serv/plugin',
    entrypoint,
  ].filter(Boolean), {
    stdout: 'inherit',
    stderr: 'inherit',
    stdin: 'inherit',
  })

  const code = await proc.exited

  process.exit(code)
}

export async function dev (): Promise<void> {
  await run(true)
}

export async function prod (): Promise<void> {
  await run(false)
}
