export * from './core'

import type { AppOptions, App } from './core'

export declare function createApp (
  port: number,
  opts?: AppOptions,
): App
