import * as uuid from 'uuid'

export const TYPES = {
  REQUEST: 'request',
  RESPONSE: 'response',
}

export function createMessage (type, opts = {}) {
  return {
    ...opts,
    type,
    id: opts.id ?? uuid.v4(),
    timestamp: new Date().toISOString(),
    headers: opts.headers ?? new Headers(),
    body: opts.body ?? null,
  }
}
