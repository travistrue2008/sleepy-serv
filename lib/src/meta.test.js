import {
  range,
  traverse,
  map,
  deepCopy,
  setValueByPath,
  getValueByPath,
} from './meta'

describe('range()', () => {
  test('when invoked without providing a "startIndex"', () => {
    const result = range(3)

    expect(result).toStrictEqual([0, 1, 2])
  })

  test('when invoked WITH providing a "startIndex"', () => {
    const result = range(3, 2)

    expect(result).toStrictEqual([2, 3, 4])
  })
})

describe('traverse()', () => {
  const SCHEMA = {
    a: false,
    b: {
      c: 1,
    },
    d: [],
    e: [''],
  }

  test('when traversing', () => {
    const onKeyMock = jest.fn(() => {})

    traverse(SCHEMA, onKeyMock)

    expect(onKeyMock).toHaveBeenCalledTimes(6)
    expect(onKeyMock).toHaveBeenNthCalledWith(1, ['a'], false)
    expect(onKeyMock).toHaveBeenNthCalledWith(2, ['b'], { c: 1 })
    expect(onKeyMock).toHaveBeenNthCalledWith(3, ['b', 'c'], 1)
    expect(onKeyMock).toHaveBeenNthCalledWith(4, ['d'], [])
    expect(onKeyMock).toHaveBeenNthCalledWith(5, ['e'], [''])
    expect(onKeyMock).toHaveBeenNthCalledWith(6, ['e', '0'], '')
  })

  test('when traversing with root enabled', () => {
    const onKeyMock = jest.fn(() => {})

    traverse(SCHEMA, onKeyMock, true)

    expect(onKeyMock).toHaveBeenCalledTimes(7)
    expect(onKeyMock).toHaveBeenNthCalledWith(1, [], SCHEMA)
    expect(onKeyMock).toHaveBeenNthCalledWith(2, ['a'], false)
    expect(onKeyMock).toHaveBeenNthCalledWith(3, ['b'], { c: 1 })
    expect(onKeyMock).toHaveBeenNthCalledWith(4, ['b', 'c'], 1)
    expect(onKeyMock).toHaveBeenNthCalledWith(5, ['d'], [])
    expect(onKeyMock).toHaveBeenNthCalledWith(6, ['e'], [''])
    expect(onKeyMock).toHaveBeenNthCalledWith(7, ['e', '0'], '')
  })

  test('when mutating the object while traversing', () => {
    const schema = {
      a: {
        b: 1,
      },
    }

    traverse(schema, (keyPath, _value) => {
      if (keyPath[0] === 'a' && keyPath[1] === 'b') {
        setValueByPath(schema, keyPath, 2)
      }
    })

    expect(schema).toStrictEqual({
      a: {
        b: 2,
      },
    })
  })

  test('when mutating a complex property to NULL', () => {
    const obj = {
      userId: {
        id: null,
        label: 'None',
      },
    }

    const fn = () => traverse(obj, keyPath => {
      if (keyPath[0] === 'userId') {
        setValueByPath(obj, keyPath, null)
      }
    })

    expect(fn).not.toThrow()
  })
})

describe('map()', () => {
  test('when invoked', () => {
    const OBJ_NUMERIC = {
      a: 1,
      b: { c: 2, d: 3 },
      e: [5, 8, 13],
    }
    const OBJ_STRING = {
      a: '1',
      b: { c: '2', d: '3' },
      e: ['5', '8', '13'],
    }

    const result = map(OBJ_NUMERIC, (_, v) => `${v}`)

    expect(result).toStrictEqual(OBJ_STRING)
  })
})

describe('deepCopy()', () => {
  test('when invoked', () => {
    const SCHEMA = {
      a: false,
      b: 2,
      c: 'asdf',
      d: {
        e: false,
      },
      f: ['x', 'y', 'z'],
    }

    expect(deepCopy(SCHEMA)).not.toBe(SCHEMA)
    expect(deepCopy(SCHEMA)).toStrictEqual(SCHEMA)
  })
})

describe('setValueByPath()', () => {
  function gen () {
    return {
      a: 12,
      b: '123',
      c: {
        d: ['asdf'],
      },
      e: '456',
    }
  }

  test('when setting a top-level property', () => {
    const schema = gen()

    setValueByPath(schema, ['a'], 42)

    expect(schema).toStrictEqual({
      a: 42,
      b: '123',
      c: {
        d: ['asdf'],
      },
      e: '456',
    })
  })

  test('when setting the last top-level property', () => {
    const schema = gen()

    setValueByPath(schema, ['e'], 42)

    expect(schema).toStrictEqual({
      a: 12,
      b: '123',
      c: {
        d: ['asdf'],
      },
      e: 42,
    })
  })

  test('when overriding an object-type property', () => {
    const schema = gen()

    setValueByPath(schema, ['c'], 42)

    expect(schema).toStrictEqual({
      a: 12,
      b: '123',
      c: 42,
      e: '456',
    })
  })

  test('when setting a property on a sub-object', () => {
    const schema = gen()

    setValueByPath(schema, ['c', 'd'], [42])

    expect(schema).toStrictEqual({
      a: 12,
      b: '123',
      c: {
        d: [42],
      },
      e: '456',
    })
  })

  test('when setting a property within an array', () => {
    const schema = gen()

    setValueByPath(schema, ['c', 'd', '0'], 42)

    expect(schema).toStrictEqual({
      a: 12,
      b: '123',
      c: {
        d: [42],
      },
      e: '456',
    })
  })

  test('when assigning a new property', () => {
    const schema = gen()

    setValueByPath(schema, ['f'], 42)

    expect(schema).toStrictEqual({
      a: 12,
      b: '123',
      c: {
        d: ['asdf'],
      },
      e: '456',
      f: 42,
    })
  })

  test('when setting a new sub-property on a property that does not exist', () => {
    const schema = gen()
    const fn = () => setValueByPath(schema, ['f', 'g'], 42)

    expect(fn).toThrow(new Error(`undefined is not an object (evaluating 'subObj[key] = value')`))
  })
})

describe('getValueByPath()', () => {
  const SCHEMA = {
    a: 12,
    b: {
      c: ['asdf'],
    },
  }

  test('when invoked on root value', () => {
    const result = getValueByPath(SCHEMA, [])

    expect(result).toStrictEqual(SCHEMA)
  })

  test('when invoked on a top-level primitive value', () => {
    const result = getValueByPath(SCHEMA, ['a'])

    expect(result).toStrictEqual(12)
  })

  test('when invoked on a top-level complex value', () => {
    const result = getValueByPath(SCHEMA, ['b'])

    expect(result).toStrictEqual({ c: ['asdf'] })
  })

  test('when invoked on a nested value', () => {
    const result = getValueByPath(SCHEMA, ['b', 'c'])

    expect(result).toStrictEqual(['asdf'])
  })

  test('when invoked on an array value', () => {
    const result = getValueByPath(SCHEMA, ['b', 'c'])

    expect(result).toStrictEqual(['asdf'])
  })

  test('returns undefined path does not exist', () => {
    const result = getValueByPath(SCHEMA, ['x'])

    expect(result).toStrictEqual(undefined)
  })

  test('returns undefined path does not exist (beyond)', () => {
    const result = getValueByPath(SCHEMA, ['x', 'y'])

    expect(result).toStrictEqual(undefined)
  })
})
