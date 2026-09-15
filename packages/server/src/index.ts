export * from './core'

import type { AppOptions, App } from './core'

export declare function createApp<T = void> (
  port: number,
  opts?: AppOptions<T>,
): App<T>
