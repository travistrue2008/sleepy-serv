export * from './core'

import type { App, AppOptions } from './core'

export declare function createApp (
  port: number,
  opts?: AppOptions,
): App
