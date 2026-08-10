export type IdGenerator = () => string

export const defaultIdGenerator: IdGenerator = () => crypto.randomUUID()

let _uuidFn: IdGenerator = defaultIdGenerator

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
