import fs from 'fs'
import { loadConfig } from '../plugin/config'

export async function dev (): Promise<void> {
  const config = await loadConfig()
  const entrypoint = config.app?.entrypoint ?? './src/index.ts'

  if (!fs.existsSync(entrypoint)) {
    console.error(`Entrypoint not found: ${entrypoint}`)

    process.exit(1)
  }

  const proc = Bun.spawn([
    'bun', '--watch',
    '--preload', 'sleepy-serv/plugin',
    entrypoint,
  ], {
    stdout: 'inherit',
    stderr: 'inherit',
    stdin: 'inherit',
  })

  const code = await proc.exited

  process.exit(code)
}
