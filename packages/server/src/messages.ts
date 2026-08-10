import Ajv from 'ajv'
import addFormats from 'ajv-formats'
import crypto from 'node:crypto'
import { formatError } from './utils'
import { UnprocessableContentError } from './errors'

import type { ValidateFunction } from 'ajv'
import type { HttpMethod } from './utils'

export const MessageType = {
  Request: 'request',
  Response: 'response',
  Welcome: 'welcome',
  Heartbeat: 'heartbeat',
  Notification: 'notification',
} as const

export type MessageType = typeof MessageType[keyof typeof MessageType]

export const RECEIVED_MESSAGE_TYPES: string[] = [
  MessageType.Heartbeat,
  MessageType.Request,
]

export type BaseMessage = {
  id: string
  clientId: string
  type: MessageType
  timestamp: string
}

export type HeartbeatMessage = BaseMessage & {
  type: typeof MessageType.Heartbeat
}

export type RequestMessage = BaseMessage & {
  type: typeof MessageType.Request
  method: HttpMethod
  route: string
  headers: Headers
  query: Record<string, unknown>
  body: unknown
}

export type ResponseMessage = BaseMessage & {
  type: typeof MessageType.Response
  status: number
  headers: Headers
  body: unknown
}

export type WelcomeMessage = BaseMessage & {
  type: typeof MessageType.Welcome
  headers: Headers
  body: {
    heartbeatInterval: number
    token: string
  }
}

export type NotificationMessage = BaseMessage & {
  type: typeof MessageType.Notification
  event: string
  headers: Headers
  body: unknown
}

export type Message =
  | HeartbeatMessage
  | RequestMessage
  | ResponseMessage
  | WelcomeMessage
  | NotificationMessage

export type RawMessage = {
  type?: string
  [key: string]: unknown
}

export type IncomingMessage = HeartbeatMessage | RequestMessage

export type MessageContent<T extends MessageType = MessageType> =
  Partial<Pick<Extract<Message, { type: T }>, 'id'>>
    & Omit<Extract<Message, { type: T }>, keyof BaseMessage>

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
      enum: RECEIVED_MESSAGE_TYPES,
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
      const: MessageType.Heartbeat,
    },
  },
  required: SCHEMA_BASE.required,
})

const validateRequest = ajv.compile({
  type: 'object',
  properties: {
    ...SCHEMA_BASE.properties,
    type: {
      type: 'string',
      const: MessageType.Request,
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
      type: [
        'boolean',
        'number',
        'string',
        'object',
        'array',
        'null',
      ],
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

const TYPE_VALIDATORS: Record<string, ValidateFunction> = {
  [MessageType.Heartbeat]: validateHeartbeat,
  [MessageType.Request]: validateRequest,
}

export function createMessage<T extends MessageType> (
  clientId: string,
  type: T,
  content: MessageContent<T>,
): Extract<Message, { type: T }> {
  const id = content.id ?? crypto.randomUUID()
  const timestamp = new Date().toISOString()

  const base = {
    id,
    clientId,
    type,
    timestamp,
  }

  return {
    ...content,
    ...base,
  } as Extract<Message, { type: T }>
}

export function validateMessage (message: RawMessage): void {
  if (message.type === undefined) {
    throw new UnprocessableContentError([
      {
        path: '',
        message: `must have required property 'type'`,
      },
    ])
  }

  if (!RECEIVED_MESSAGE_TYPES.includes(message.type)) {
    throw new UnprocessableContentError([
      {
        path: 'type',
        message: `must be one of: ${RECEIVED_MESSAGE_TYPES}`,
      },
    ])
  }

  const validate = TYPE_VALIDATORS[message.type]

  if (!validate(message)) {
    const errors = validate.errors!.map(item => formatError('', item))

    throw new UnprocessableContentError(errors)
  }
}
