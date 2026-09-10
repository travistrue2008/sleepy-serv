import { describe, test, expect } from 'bun:test'
import { generateBarrelModule } from './codegen'

import type { ScanResult } from './scanner'

describe('generateBarrelModule()', () => {
  test('when given one route', () => {
    const input: ScanResult = {
      meta: [],
      methods: [
        {
          method: 'GET',
          path: '/',
          modulePath: '/app/api/get.ts',
        },
      ],
    }

    const output = generateBarrelModule(input)

    expect(output).toContain(`import handler_0 from '/app/api/get.ts'`)
    expect(output).toContain(`method: 'GET'`)
    expect(output).toContain(`path: '/'`)
    expect(output).toContain(`export * from './core'`)
    expect(output).toContain('export function createApp')
  })

  test('when given multiple routes', () => {
    const input: ScanResult = {
      methods: [
        {
          method: 'GET',
          path: '/users',
          modulePath: '/app/api/users/get.ts',
        },
        {
          method: 'POST',
          path: '/users',
          modulePath: '/app/api/users/post.ts',
        },
        {
          method: 'DELETE',
          path: '/users/:id',
          modulePath: '/app/api/users/[id]/delete.ts',
        },
      ],
      meta: [],
    }

    const output = generateBarrelModule(input)

    const STATEMENTS = [
      `import handler_0 from '/app/api/users/get.ts'`,
      `import handler_1 from '/app/api/users/post.ts'`,
      `import handler_2 from '/app/api/users/[id]/delete.ts'`,
      `method: 'GET'`,
      `method: 'POST'`,
      `method: 'DELETE'`,
    ]

    STATEMENTS.forEach(statement => {
      expect(output).toContain(statement)
    })
  })

  test('when meta files are present', () => {
    const input: ScanResult = {
      meta: [
        {
          path: '/',
          modulePath: '/app/api/_meta.ts',
        },
      ],
      methods: [
        {
          method: 'GET',
          path: '/users',
          modulePath: '/app/api/users/get.ts',
        },
      ],
    }

    const output = generateBarrelModule(input)

    expect(output).toContain('...(metaModule_0.middleware ?? [])')
  })

  test('when nested meta files exist', () => {
    const input: ScanResult = {
      meta: [
        {
          path: '/',
          modulePath: '/app/api/_meta.ts',
        },
        {
          path: '/users',
          modulePath: '/app/api/users/_meta.ts',
        },
      ],
      methods: [
        {
          method: 'GET',
          path: '/users',
          modulePath: '/app/api/users/get.ts',
        },
      ],
    }

    const output = generateBarrelModule(input)
    const outerIdx = output.indexOf('...(metaModule_0.middleware ?? [])')
    const innerIdx = output.indexOf('...(metaModule_1.middleware ?? [])')

    expect(outerIdx).toBeGreaterThan(-1)
    expect(innerIdx).toBeGreaterThan(-1)
    expect(outerIdx).toBeLessThan(innerIdx)
  })

  test('when a handler might be an array', () => {
    const input: ScanResult = {
      meta: [],
      methods: [
        {
          method: 'GET',
          path: '/',
          modulePath: '/app/api/get.ts',
        },
      ],
    }

    const output = generateBarrelModule(input)

    expect(output).toContain('Array.isArray(handler_0)')
  })

  test('when meta is present', () => {
    const input: ScanResult = {
      meta: [
        {
          path: '/',
          modulePath: '/app/api/_meta.ts',
        },
      ],
      methods: [
        {
          method: 'GET',
          path: '/',
          modulePath: '/app/api/get.ts',
        },
      ],
    }

    const output = generateBarrelModule(input)

    expect(output).toContain('meta: [')
    expect(output).toContain('metaModule_0.middleware ?? []')
  })

  test('when generating the barrel', () => {
    const input: ScanResult = {
      meta: [],
      methods: [
        {
          method: 'GET',
          path: '/',
          modulePath: '/app/api/get.ts',
        },
      ],
    }

    const output = generateBarrelModule(input)

    expect(output.startsWith(`export * from './core'`)).toBe(true)
    expect(output).toContain('export function createApp (port, opts = {})')
  })
})
