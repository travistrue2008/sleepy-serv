import crypto from 'node:crypto'
import { describe, test, expect } from 'bun:test'
import { UnprocessableContentError } from './errors'
import { StatusCode } from './utils'

import {
  MessageType,
  RECEIVED_MESSAGE_TYPES,
  createMessage,
  validateMessage,
} from './messages'

const ID = crypto.randomUUID()
const CLIENT_ID = crypto.randomUUID()
const STATUS = StatusCode.Ok
const METHOD = 'GET'
const ROUTE = '/users/123'
const TIMESTAMP = '2000-01-01T00:00:00.000Z'
const HEADERS = new Headers({ a: '1' })
const EVENT = 'thing-happened'
const QUERY = { page: '2' }
const BODY = { a: 1 }

const WELCOME_BODY = {
  heartbeatInterval: 30_000,
  token: 'test-token',
}

describe('createMessage()', () => {
  describe(`when "type" IS "${MessageType.Request}"`, () => {
    test('when "content.id" is NOT provided', () => {
      const res = createMessage(CLIENT_ID, MessageType.Request, {
        method: METHOD,
        route: ROUTE,
        headers: HEADERS,
        query: QUERY,
        body: BODY,
      })

      expect(res).toStrictEqual({
        id: res.id,
        clientId: CLIENT_ID,
        type: MessageType.Request,
        timestamp: TIMESTAMP,
        method: METHOD,
        route: ROUTE,
        headers: HEADERS,
        query: QUERY,
        body: BODY,
      })
    })

    test('when "content.id" IS provided', () => {
      const res = createMessage(CLIENT_ID, MessageType.Request, {
        id: ID,
        method: METHOD,
        route: ROUTE,
        headers: HEADERS,
        query: QUERY,
        body: BODY,
      })

      expect(res).toStrictEqual({
        id: ID,
        clientId: CLIENT_ID,
        type: MessageType.Request,
        timestamp: TIMESTAMP,
        method: METHOD,
        route: ROUTE,
        headers: HEADERS,
        query: QUERY,
        body: BODY,
      })
    })
  })

  describe(`when "type" IS "${MessageType.Response}"`, () => {
    test('when "content.id" is NOT provided', () => {
      const res = createMessage(CLIENT_ID, MessageType.Response, {
        status: STATUS,
        headers: HEADERS,
        body: BODY,
      })

      expect(res).toStrictEqual({
        id: res.id,
        clientId: CLIENT_ID,
        type: MessageType.Response,
        timestamp: TIMESTAMP,
        status: STATUS,
        headers: HEADERS,
        body: BODY,
      })
    })

    test('when "content.id" IS provided', () => {
      const res = createMessage(CLIENT_ID, MessageType.Response, {
        id: ID,
        status: STATUS,
        headers: HEADERS,
        body: BODY,
      })

      expect(res).toStrictEqual({
        id: ID,
        clientId: CLIENT_ID,
        type: MessageType.Response,
        timestamp: TIMESTAMP,
        status: STATUS,
        headers: HEADERS,
        body: BODY,
      })
    })
  })

  describe(`when "type" IS "${MessageType.Welcome}"`, () => {
    test('when "content.id" is NOT provided', () => {
      const res = createMessage(CLIENT_ID, MessageType.Welcome, {
        headers: HEADERS,
        body: WELCOME_BODY,
      })

      expect(res).toStrictEqual({
        id: res.id,
        clientId: CLIENT_ID,
        type: MessageType.Welcome,
        timestamp: TIMESTAMP,
        headers: HEADERS,
        body: WELCOME_BODY,
      })
    })

    test('when "content.id" IS provided', () => {
      const res = createMessage(CLIENT_ID, MessageType.Welcome, {
        id: ID,
        headers: HEADERS,
        body: WELCOME_BODY,
      })

      expect(res).toStrictEqual({
        id: ID,
        clientId: CLIENT_ID,
        type: MessageType.Welcome,
        timestamp: TIMESTAMP,
        headers: HEADERS,
        body: WELCOME_BODY,
      })
    })
  })

  describe(`when "type" IS "${MessageType.Heartbeat}"`, () => {
    test('when "content.id" is NOT provided', () => {
      const res = createMessage(CLIENT_ID, MessageType.Heartbeat, {})

      expect(res).toStrictEqual({
        id: res.id,
        clientId: CLIENT_ID,
        type: MessageType.Heartbeat,
        timestamp: TIMESTAMP,
      })
    })

    test('when "content.id" IS provided', () => {
      const res = createMessage(CLIENT_ID, MessageType.Heartbeat, { id: ID })

      expect(res).toStrictEqual({
        id: ID,
        clientId: CLIENT_ID,
        type: MessageType.Heartbeat,
        timestamp: TIMESTAMP,
      })
    })
  })

  describe(`when "type" IS "${MessageType.Notification}"`, () => {
    test('when "content.id" is NOT provided', () => {
      const res = createMessage(CLIENT_ID, MessageType.Notification, {
        event: EVENT,
        headers: HEADERS,
        body: BODY,
      })

      expect(res).toStrictEqual({
        id: res.id,
        clientId: CLIENT_ID,
        type: MessageType.Notification,
        timestamp: TIMESTAMP,
        event: EVENT,
        headers: HEADERS,
        body: BODY,
      })
    })

    test('when "content.id" IS provided', () => {
      const res = createMessage(CLIENT_ID, MessageType.Notification, {
        id: ID,
        event: EVENT,
        headers: HEADERS,
        body: BODY,
      })

      expect(res).toStrictEqual({
        id: ID,
        clientId: CLIENT_ID,
        type: MessageType.Notification,
        timestamp: TIMESTAMP,
        event: EVENT,
        headers: HEADERS,
        body: BODY,
      })
    })
  })
})

describe('validateMessage()', () => {
  describe('general', () => {
    const MESSAGE_VALID = {
      id: ID,
      clientId: ID,
      type: MessageType.Request,
      method: METHOD,
      route: ROUTE,
      timestamp: TIMESTAMP,
      headers: new Headers(),
      query: {},
      body: null,
    }

    test('when the "id" field is missing', () => {
      const fn = () => validateMessage({
        ...MESSAGE_VALID,
        id: undefined,
      })

      expect(fn).toThrow(new UnprocessableContentError([
        {
          path: '',
          message: `must have required property 'id'`,
        },
      ]))
    })

    test('when the "id" field is invalid', () => {
      const fn = () => validateMessage({
        ...MESSAGE_VALID,
        id: 'invalid',
      })

      expect(fn).toThrow(new UnprocessableContentError([
        {
          path: 'id',
          message: 'must match format "uuid"',
        },
      ]))
    })

    test('when the "clientId" field is missing', () => {
      const fn = () => validateMessage({
        ...MESSAGE_VALID,
        clientId: undefined,
      })

      expect(fn).toThrow(new UnprocessableContentError([
        {
          path: '',
          message: `must have required property 'clientId'`,
        },
      ]))
    })

    test('when the "clientId" field is invalid', () => {
      const fn = () => validateMessage({
        ...MESSAGE_VALID,
        clientId: 'invalid',
      })

      expect(fn).toThrow(new UnprocessableContentError([
        {
          path: 'clientId',
          message: 'must match format "uuid"',
        },
      ]))
    })

    test('when the "type" field is missing', () => {
      const fn = () => validateMessage({
        ...MESSAGE_VALID,
        type: undefined,
      })

      expect(fn).toThrow(new UnprocessableContentError([
        {
          path: '',
          message: `must have required property 'type'`,
        },
      ]))
    })

    test('when the "type" field is invalid', () => {
      const fn = () => validateMessage({
        ...MESSAGE_VALID,
        type: 'invalid',
      })

      expect(fn).toThrow(new UnprocessableContentError([
        {
          path: 'type',
          message: `must be one of: ${RECEIVED_MESSAGE_TYPES}`,
        },
      ]))
    })

    test('when the "timestamp" field is missing', () => {
      const fn = () => validateMessage({
        ...MESSAGE_VALID,
        timestamp: undefined,
      })

      expect(fn).toThrow(new UnprocessableContentError([
        {
          path: '',
          message: `must have required property 'timestamp'`,
        },
      ]))
    })

    test('when the "timestamp" field is invalid', () => {
      const fn = () => validateMessage({
        ...MESSAGE_VALID,
        timestamp: '2000-01-01',
      })

      expect(fn).toThrow(new UnprocessableContentError([
        {
          path: 'timestamp',
          message: 'must match format "date-time"',
        },
      ]))
    })
  })

  describe(`when "type" IS "${MessageType.Request}"`, () => {
    const MESSAGE_VALID = {
      id: ID,
      clientId: ID,
      type: MessageType.Request,
      method: METHOD,
      route: ROUTE,
      timestamp: TIMESTAMP,
      headers: new Headers(),
      query: {},
      body: null,
    }

    test('when unknown properties are provided (stripped, still valid)', () => {
      const message = {
        ...MESSAGE_VALID,
        extra: 'nope',
      }

      expect(() => validateMessage(message)).not.toThrow()
      expect(message).not.toHaveProperty('extra')
    })

    test('when the "method" field is missing', () => {
      const fn = () => validateMessage({
        ...MESSAGE_VALID,
        method: undefined,
      })

      expect(fn).toThrow(new UnprocessableContentError([
        {
          path: '',
          message: `must have required property 'method'`,
        },
      ]))
    })

    test('when the "method" field is invalid', () => {
      const fn = () => validateMessage({
        ...MESSAGE_VALID,
        method: 'invalid',
      })

      expect(fn).toThrow(new UnprocessableContentError([
        {
          path: 'method',
          message: 'must be equal to one of the allowed values',
        },
      ]))
    })

    test('when the "route" field is missing', () => {
      const fn = () => validateMessage({
        ...MESSAGE_VALID,
        route: undefined,
      })

      expect(fn).toThrow(new UnprocessableContentError([
        {
          path: '',
          message: `must have required property 'route'`,
        },
      ]))
    })

    test('when the "route" field is invalid', () => {
      const fn = () => validateMessage({
        ...MESSAGE_VALID,
        route: 'invalid route',
      })

      expect(fn).toThrow(new UnprocessableContentError([
        {
          path: 'route',
          message: 'must match format "uri-reference"',
        },
      ]))
    })

    test('when the "headers" field is missing', () => {
      const fn = () => validateMessage({
        ...MESSAGE_VALID,
        headers: undefined,
      })

      expect(fn).toThrow(new UnprocessableContentError([
        {
          path: '',
          message: `must have required property 'headers'`,
        },
      ]))
    })

    test('when the "headers" field is invalid (null)', () => {
      const fn = () => validateMessage({
        ...MESSAGE_VALID,
        headers: null,
      })

      expect(fn).toThrow(new UnprocessableContentError([
        {
          path: 'headers',
          message: 'must be object',
        },
      ]))
    })

    test('when the "headers" field is invalid (array)', () => {
      const fn = () => validateMessage({
        ...MESSAGE_VALID,
        headers: [],
      })

      expect(fn).toThrow(new UnprocessableContentError([
        {
          path: 'headers',
          message: 'must be object',
        },
      ]))
    })

    test('when the "query" field is missing', () => {
      const fn = () => validateMessage({
        ...MESSAGE_VALID,
        query: undefined,
      })

      expect(fn).toThrow(new UnprocessableContentError([
        {
          path: '',
          message: `must have required property 'query'`,
        },
      ]))
    })

    test('when the "query" field is invalid (null)', () => {
      const fn = () => validateMessage({
        ...MESSAGE_VALID,
        query: null,
      })

      expect(fn).toThrow(new UnprocessableContentError([
        {
          path: 'query',
          message: 'must be object',
        },
      ]))
    })

    test('when the "body" field is missing', () => {
      const fn = () => validateMessage({
        ...MESSAGE_VALID,
        body: undefined,
      })

      expect(fn).toThrow(new UnprocessableContentError([
        {
          path: '',
          message: `must have required property 'body'`,
        },
      ]))
    })

    test('when the "body" field is invalid (null)', () => {
      const fn = () => validateMessage({
        ...MESSAGE_VALID,
        body: null,
      })

      expect(fn).not.toThrow()
    })

    test('when the "body" field is invalid (object)', () => {
      const fn = () => validateMessage({
        ...MESSAGE_VALID,
        body: {
          a: 1,
        },
      })

      expect(fn).not.toThrow()
    })

    test('when the "body" field is invalid (array)', () => {
      const fn = () => validateMessage({
        ...MESSAGE_VALID,
        body: [],
      })

      expect(fn).not.toThrow()
    })

    test('when a valid request is provided', () => {
      const fn = () => validateMessage(MESSAGE_VALID)

      expect(fn).not.toThrow()
    })

    test.each([
      'HEAD',
      'GET',
      'PUT',
      'POST',
      'PATCH',
      'DELETE',
    ])('when "method" is "%s"', (method) => {
      const fn = () => validateMessage({
        ...MESSAGE_VALID,
        method,
      })

      expect(fn).not.toThrow()
    })
  })
})
