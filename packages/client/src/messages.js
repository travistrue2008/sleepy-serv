import { id } from './utils'

export const TYPES = {
  WELCOME: 'welcome',
  HEARTBEAT: 'heartbeat',
  REQUEST: 'request',
  RESPONSE: 'response',
  NOTIFICATION: 'notification',
}

export function createMessage (clientId, type, opts = {}) {
  return {
    ...opts,
    id: opts.id ?? id(),
    clientId,
    type,
    timestamp: new Date().toISOString(),
    headers: opts.headers ?? new Headers(),
    body: opts.body ?? null,
  }
}
