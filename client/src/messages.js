import * as uuid from 'uuid'

export const TYPES = {
  REQUEST: 'request',
  RESPONSE: 'response',
}

export function createBaseMessage() {
  return {
    type: '',
    id: uuid.v4(),
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
