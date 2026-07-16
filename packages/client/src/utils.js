let _uuidFn = () => crypto.randomUUID()

export function id () {
  return _uuidFn()
}

export function setIdGenerator (fn) {
  _uuidFn = fn
}
