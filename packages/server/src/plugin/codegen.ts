import type { ScanResult } from './scanner'

export function generateRoutesModule (scanResult: ScanResult): string {
  const lines: string[] = []

  for (let i = 0; i < scanResult.methods.length; i++) {
    const entry = scanResult.methods[i]

    lines.push(`import handler_${i} from '${entry.modulePath}'`)
  }

  for (let i = 0; i < scanResult.meta.length; i++) {
    const entry = scanResult.meta[i]

    lines.push(`import { middleware as meta_${i} } from '${entry.modulePath}'`)
  }

  lines.push('')

  for (let i = 0; i < scanResult.methods.length; i++) {
    const entry = scanResult.methods[i]

    lines.push(`
if (typeof handler_${i} === 'undefined') {
  throw new ReferenceError(
    'No default export defined in:\\n${entry.modulePath}',
  )
}
    `.trim())
  }

  lines.push('')

  for (let i = 0; i < scanResult.methods.length; i++) {
    lines.push(`
const chain_${i} = Array.isArray(handler_${i})
  ? handler_${i}
  : [handler_${i}]
    `.trim())
  }

  lines.push('')

  const routeEntries = scanResult.methods.map((entry, i) => {
    const applicableMeta = scanResult.meta
      .filter(m => entry.path.startsWith(m.path))
      .sort((a, b) => a.path.length - b.path.length)

    const metaSpreads = applicableMeta
      .map(m => {
        const metaIndex = scanResult.meta.indexOf(m)

        return `...(meta_${metaIndex} ?? [])`
      })

    const chainParts = [...metaSpreads, `...chain_${i}`]

    return '  {'
      + ` method: '${entry.method}',`
      + ` path: '${entry.path}',`
      + ` chain: [${chainParts.join(', ')}]`
      + ' }'
  })

  const metaEntries = scanResult.meta.map((entry, i) => {
    return '  {'
      + ` path: '${entry.path}',`
      + ` middleware: meta_${i} ?? []`
      + ' }'
  })

  lines.push('export const config = {')
  lines.push('  routes: [')
  lines.push(routeEntries.join(',\n'))
  lines.push('  ],')
  lines.push('  meta: [')
  lines.push(metaEntries.join(',\n'))
  lines.push('  ],')
  lines.push('}')

  return lines.join('\n')
}

export function generateWrapperModule (apiRoot: string): string {
  const routesImport = `sleepy:routes:${apiRoot}`

  return [
    'export * from \'sleepy-serv/core\'',
    '',
    'import { createApp as _createApp }'
    + ' from \'sleepy-serv/core\'',
    `import { config } from '${routesImport}'`,
    '',
    'export function createApp (port, opts = {}) {',
    '  return _createApp(port, config, opts)',
    '}',
  ].join('\n')
}
