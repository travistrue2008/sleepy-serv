import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import * as uuid from 'uuid'
import { formatError } from './utils'
import { UnprocessableContentError } from './errors'

export const TYPES = {
  REQUEST: 'request',
  RESPONSE: 'response',
  WELCOME: 'welcome',
  HEARTBEAT: 'heartbeat',
}

export const TYPES_RECEIVED = [
  TYPES.REQUEST,
  TYPES.HEARTBEAT,
]

const ajv = new Ajv({
  allErrors: true,
  removeAdditional: 'all',
})

addFormats(ajv)

const SCHEMA_BASE = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      format: 'uuid',
    },
    clientId: {
      type: 'string',
      format: 'uuid',
    },
    type: {
      type: 'string',
      enum: TYPES_RECEIVED,
    },
    timestamp: {
      type: 'string',
      format: 'date-time',
    },
  },
  required: [
    'id',
    'clientId',
    'type',
    'timestamp',
  ],
}

const validateHeartbeat = ajv.compile({
  type: 'object',
  properties: {
    ...SCHEMA_BASE.properties,
    type: {
      type: 'string',
      const: TYPES.HEARTBEAT,
    },
  },
  required: [
    'type',
  ],
})

const validateRequest = ajv.compile({
  type: 'object',
  properties: {
    ...SCHEMA_BASE.properties,
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
    ...SCHEMA_BASE.required,
    'method',
    'route',
    'headers',
    'query',
    'body',
  ],
})

const TYPE_VALIDATORS = {
  [TYPES.HEARTBEAT]: validateHeartbeat,
  [TYPES.REQUEST]: validateRequest,
}

export function createMessage (clientId, type, opts = {}) {
  const timestamp = new Date().toISOString()

  const base = {
    id: opts.id ?? uuid.v4(),
    clientId,
    type,
    timestamp,
  }

  return {
    ...opts,
    ...base,
  }
}

export function validateMessage (message) {
  const validate = TYPE_VALIDATORS[message.type]

  if (message.type === undefined) {
    throw new UnprocessableContentError([
      {
        path: '',
        message: `must have required property 'type'`,
      },
    ])
  }

  if (!TYPES_RECEIVED.includes(message.type)) {
    throw new UnprocessableContentError([
      {
        path: 'type',
        message: `must be one of: ${TYPES_RECEIVED}`,
      },
    ])
  }

  if (!validate(message)) {
    const errors = validate.errors.map(item => formatError('', item))

    throw new UnprocessableContentError(errors)
  }
}
