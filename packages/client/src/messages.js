import * as uuid from 'uuid'

export const TYPES = {
  WELCOME: 'welcome',
  HEARTBEAT: 'heartbeat',
  REQUEST: 'request',
  RESPONSE: 'response',
}

export function createMessage (clientId, type, opts = {}) {
  return {
    ...opts,
    id: opts.id ?? uuid.v4(),
    clientId,
    type,
    timestamp: new Date().toISOString(),
    headers: opts.headers ?? new Headers(),
    body: opts.body ?? null,
  }
}
