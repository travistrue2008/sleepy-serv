import { id } from './utils.js'

export const MessageType = {
  Welcome: 'welcome',
  Heartbeat: 'heartbeat',
  Request: 'request',
  Response: 'response',
  Notification: 'notification',
} as const

export type MessageType = typeof MessageType[keyof typeof MessageType]

export type MessageHeaders = Headers | Record<string, string>

export type MessageOptions = {
  id?: string
  headers?: MessageHeaders
  body?: unknown
  [key: string]: unknown
}

export type Message = {
  id: string
  clientId: string
  type: MessageType
  timestamp: string
  headers: MessageHeaders
  body: unknown
  [key: string]: unknown
}

export function createMessage (
  clientId: string,
  type: MessageType,
  opts: MessageOptions = {},
): Message {
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
