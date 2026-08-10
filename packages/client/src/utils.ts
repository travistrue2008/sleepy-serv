export type IdGenerator = () => string

let _uuidFn: IdGenerator = () => crypto.randomUUID()

export function joinRoute (...segments: string[]): string {
  const joined = segments
    .filter(Boolean)
    .join('/')
    .replace(/\/{2,}/g, '/')

  return joined.startsWith('/') ? joined : `/${joined}`
}


export function id (): string {
  return _uuidFn()
}

export function setIdGenerator (fn: IdGenerator): void {
  _uuidFn = fn
}
