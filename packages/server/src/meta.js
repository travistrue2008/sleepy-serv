export function range (count, startIndex = 0) {
  return new Array(count).fill(0).map((_, index) => index + startIndex)
}

export function traverse (obj, onKey, includeRoot = false) {
  const path = ['']

  const fn = target => {
    Object.entries(target).forEach(([k, v]) => {
      path[path.length - 1] = k

      const dateType = v instanceof Date
      const clip = onKey([...path], v) === false
      const updatedVal = getValueByPath(obj, path)
      const nonNullObj = updatedVal !== null && typeof updatedVal === 'object'

      if (!clip && !dateType && nonNullObj) {
        path.push('')
        fn(updatedVal)
        path.pop()
      }
    })
  }

  if (includeRoot) {
    onKey([], obj)
  }

  fn(obj)
}

export function map (obj, onKey) {
  const result = Array.isArray(obj) ? [] : {}

  traverse(obj, (keyPath, value) => {
    const dateType = value instanceof Date

    if (!dateType && value !== null && typeof value === 'object') {
      setValueByPath(result, keyPath, Array.isArray(value) ? [] : {})
    } else {
      setValueByPath(result, keyPath, onKey(keyPath, value))
    }
  })

  return result
}

export function deepCopy (obj) {
  return map(obj, (_, value) => value)
}

export function setValueByPath (obj, keyPath, value) {
  keyPath.reduce((subObj, key, index) => {
    if (index === keyPath.length - 1) {
      subObj[key] = value
    } else {
      return subObj[key]
    }
  }, obj)
}

export function getValueByPath (obj, keyPath) {
  return keyPath.reduce((obj, key) =>
    (typeof obj !== 'undefined' ? obj[key] : undefined), obj)
}
