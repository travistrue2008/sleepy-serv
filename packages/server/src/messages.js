import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import * as uuid from 'uuid'
import { formatError } from './utils'
import { UnprocessableContentError } from './errors'

export const TYPES = {
  REQUEST: 'request',
  RESPONSE: 'response',
}

const SCHEMA_REQUEST = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      format: 'uuid',
    },
    type: {
      type: 'string',
      const: TYPES.REQUEST,
    },
    method: {
      type: 'string',
      enum: [
        'HEAD',
        'GET',
        'PUT',
        'POST',
        'PATCH',
        'DELETE',
      ],
    },
    route: {
      type: 'string',
      format: 'uri-reference',
    },
    timestamp: {
      type: 'string',
      format: 'date-time',
    },
    headers: {
      type: 'object',
    },
    query: {
      type: 'object',
    },
    body: {
      type: ['null', 'object', 'array'],
    },
  },
  required: [
    'id',
    'type',
    'method',
    'route',
    'timestamp',
    'headers',
    'query',
    'body',
  ],
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

export function validateRequest (message) {
  const ajv = new Ajv({
    allErrors: true,
    removeAdditional: 'all',
  })

  addFormats(ajv)

  const valid = ajv.validate(SCHEMA_REQUEST, message)

  if (!valid) {
    const errors = ajv.errors.map(item => formatError('', item))

    throw new UnprocessableContentError(errors)
  }
}
