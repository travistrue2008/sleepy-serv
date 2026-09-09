import { scanRoutes } from './scanner'

import type { HttpMethod, RouteConfig } from '../core/utils'

export function buildRouteConfig (apiRoot: string): RouteConfig {
  const { methods, meta } = scanRoutes(apiRoot)
  const handlers = methods.map(m => require(m.modulePath))
  const metas = meta.map(m => require(m.modulePath))

  const routes = methods.map((entry, i) => {
    const module = handlers[i]

    if (!module.default) {
      throw new ReferenceError(`
No default export defined in:
${entry.modulePath}
      `.trim())
    }

    const chain = Array.isArray(module.default)
      ? module.default
      : [module.default]

    const applicableMeta = meta
      .filter(m => entry.path.startsWith(m.path))
      .sort((a, b) => a.path.length - b.path.length)

    const metaMiddleware = applicableMeta.flatMap(m => {
      const idx = meta.indexOf(m)

      return metas[idx].middleware ?? []
    })

    return {
      method: entry.method as HttpMethod,
      path: entry.path,
      chain: [...metaMiddleware, ...chain],
    }
  })

  const metaEntries = meta.map((entry, i) => ({
    path: entry.path,
    middleware: metas[i].middleware ?? [],
  }))

  return {
    routes,
    meta: metaEntries,
  }
}
