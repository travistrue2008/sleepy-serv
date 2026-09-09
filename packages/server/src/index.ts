import path from 'path'
import { createApp as _createApp } from './core'
import { buildRouteConfig } from './plugin/builder'

import type { App, AppOptions, RouteConfig } from './core'

export * from './core'

const SELF_PATH = import.meta.filename

let _pluginRoutes: RouteConfig | null = null

export function setRoutes (config: RouteConfig): void {
  _pluginRoutes = config
}

function getCallerDirectory (): string {
  const err = new Error()
  const lines = (err.stack ?? '').split('\n')

  for (const line of lines) {
    if (line.includes(SELF_PATH)) continue

    const match = line.match(/\((.+?):\d+:\d+\)/)
      ?? line.match(/at\s+(.+?):\d+:\d+/)

    if (match) {
      return path.dirname(match[1])
    }
  }

  return process.cwd()
}

export function createApp (
  port: number,
  opts: AppOptions = {},
): App {
  if (_pluginRoutes) {
    return _createApp(port, _pluginRoutes, opts)
  }

  const callerDir = getCallerDirectory()
  const apiRoot = path.join(callerDir, 'api')
  const config = buildRouteConfig(apiRoot)

  return _createApp(port, config, opts)
}
