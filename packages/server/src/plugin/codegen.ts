import type { ScanResult } from './scanner'

export function generateBarrelModule (
  scanResult: ScanResult,
): string {
  const lines: string[] = [
    'export * from \'./core\'',
    '',
    'import { createApp as _createApp } from \'./core\'',
    '',
  ]

  for (let i = 0; i < scanResult.methods.length; i++) {
    const entry = scanResult.methods[i]

    lines.push(
      `import handler_${i} from '${entry.modulePath}'`,
    )
  }

  for (let i = 0; i < scanResult.meta.length; i++) {
    const entry = scanResult.meta[i]

    lines.push(
      `import * as metaModule_${i}`
      + ` from '${entry.modulePath}'`,
    )
  }

  lines.push('')

  for (let i = 0; i < scanResult.methods.length; i++) {
    const entry = scanResult.methods[i]

    lines.push(
      `if (typeof handler_${i} === 'undefined') {`,
      '  throw new ReferenceError(',
      `    'No default export defined in:\\n${entry.modulePath}',`,
      '  )',
      '}',
      '',
    )
  }

  for (let i = 0; i < scanResult.methods.length; i++) {
    lines.push(
      `const chain_${i} = Array.isArray(handler_${i})`
      + ` ? handler_${i}`
      + ` : [handler_${i}]`,
    )
  }

  lines.push('')

  const routeEntries = scanResult.methods.map((entry, i) => {
    const applicableMeta = scanResult.meta
      .filter(m => entry.path.startsWith(m.path))
      .sort((a, b) => a.path.length - b.path.length)

    const metaSpreads = applicableMeta
      .map(m => {
        const metaIndex = scanResult.meta.indexOf(m)

        return `...(metaModule_${metaIndex}.middleware ?? [])`
      })

    const chainParts = [...metaSpreads, `...chain_${i}`]

    return [
      '    {',
      `      method: '${entry.method}',`,
      `      path: '${entry.path}',`,
      `      chain: [${chainParts.join(', ')}],`,
      '    }',
    ].join('\n')
  })

  const metaEntries = scanResult.meta.map((entry, i) => {
    return [
      '    {',
      `      path: '${entry.path}',`,
      `      middleware: metaModule_${i}.middleware ?? [],`,
      '    }',
    ].join('\n')
  })

  lines.push('const config = {')
  lines.push('  routes: [')
  lines.push(routeEntries.join(',\n'))
  lines.push('  ],')
  lines.push('  meta: [')
  lines.push(metaEntries.join(',\n'))
  lines.push('  ],')
  lines.push('}')
  lines.push('')
  lines.push('export function createApp (port, opts = {}) {')
  lines.push('  return _createApp(port, config, opts)')
  lines.push('}')

  return lines.join('\n')
}
