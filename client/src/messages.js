import { v4 as uuidv4 } from 'uuid'

export const TYPES = {
  REQUEST: 'request',
}

export function createBaseMessage() {
  return {
    type: '',
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    headers: {},
    body: null,
  }
}

export function createRequestMessage({ method, route, query, headers, body } = {}) {
  return {
    ...createBaseMessage(),
    type: TYPES.REQUEST,
    method,
    route,
    query: query ?? {},
    headers: headers ?? {},
    body: body ?? null,
  }
}
