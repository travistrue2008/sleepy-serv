import path from 'path'

export type SleepyConfig = {
  app?: {
    root?: string
    entrypoint?: string
  }
  build?: {
    compile?: boolean | string
    bytecode?: boolean
    outdir?: string
    plugins?: unknown[]
  }
}

export async function loadConfig (
  startDir?: string,
): Promise<SleepyConfig> {
  const dir = startDir ?? process.cwd()

  for (const ext of ['.ts', '.js']) {
    const configPath = path.join(dir, `sleepy.config${ext}`)

    try {
      const mod = await import(configPath)

      return mod.default ?? {}
    } catch {
      continue
    }
  }

  return {}
}
