import { id, setIdGenerator } from './utils'

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
