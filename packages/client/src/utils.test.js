import { id, joinRoute, setIdGenerator } from './utils'

import {
  mock,
  spyOn,
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
} from 'bun:test'

const UUID_DEFAULT = '11111111-1111-1111-1111-111111111111'

beforeEach(() => {
  spyOn(crypto, 'randomUUID').mockReturnValueOnce(UUID_DEFAULT)
})

afterEach(() => {
  mock.restore()
  setIdGenerator(() => crypto.randomUUID())
})

describe('joinRoute()', () => {
  test('when no mount path is set', () => {
    const result = joinRoute('', '/users')

    expect(result).toBe('/users')
  })

  test('when a mount path is set', () => {
    const result = joinRoute('/test-mount-path', '/users')

    expect(result).toBe('/test-mount-path/users')
  })

  test('when the route is the root path', () => {
    const result = joinRoute('/test-mount-path', '/')

    expect(result).toBe('/test-mount-path/')
  })

  test('when a segment is missing a leading slash', () => {
    const result = joinRoute('/mount', 'users')

    expect(result).toBe('/mount/users')
  })

  test('when segments contain duplicate slashes', () => {
    const result = joinRoute('/mount//sub', '//users//123')

    expect(result).toBe('/mount/sub/users/123')
  })
})

describe('id()', () => {
  test('when invoked', () => {
    const result = id()

    expect(result).toBe(UUID_DEFAULT)
    expect(crypto.randomUUID).toHaveBeenCalledOnce()
    expect(crypto.randomUUID).toHaveBeenCalledWith()
  })
})

describe('setIdGenerator()', () => {
  test('when invoked', () => {
    const ID = '123'
    const fn = mock().mockReturnValueOnce(ID)

    setIdGenerator(fn)

    const result = id()

    expect(result).toBe(ID)
    expect(crypto.randomUUID).not.toHaveBeenCalled()
    expect(fn).toHaveBeenCalledOnce()
    expect(fn).toHaveBeenCalledWith()
  })
})
