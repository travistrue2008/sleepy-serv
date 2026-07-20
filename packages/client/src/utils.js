let _uuidFn = () => crypto.randomUUID()

export function joinRoute (...segments) {
  const joined = segments
    .filter(Boolean)
    .join('/')
    .replace(/\/{2,}/g, '/')

  return joined.startsWith('/') ? joined : `/${joined}`
}


export function id () {
  return _uuidFn()
}

export function setIdGenerator (fn) {
  _uuidFn = fn
}
