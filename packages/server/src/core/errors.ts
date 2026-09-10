import { StatusCode } from './utils'

import type { FormattedError } from './utils'

export type ErrorOutput =
  | { message: string }
  | FormattedError[]
  | null

export class RequestError extends Error {
  static get status (): StatusCode {
    throw new Error('Unimplemented')
  }

  get output (): ErrorOutput {
    return this.message ? { message: this.message } : null
  }

  constructor (message: string) {
    super(message)

    this.name = 'RequestError'
  }
}

// 4xx - Client Errors

export class BadRequestError extends RequestError {
  static get status (): StatusCode {
    return StatusCode.BadRequest
  }

  constructor (message: string) {
    super(message)

    this.name = 'BadRequestError'
  }
}

export class UnauthorizedError extends RequestError {
  static get status (): StatusCode {
    return StatusCode.Unauthorized
  }

  constructor (message: string) {
    super(message)

    this.name = 'UnauthorizedError'
  }
}

export class PaymentRequiredError extends RequestError {
  static get status (): StatusCode {
    return StatusCode.PaymentRequired
  }

  constructor (message: string) {
    super(message)

    this.name = 'PaymentRequiredError'
  }
}

export class ForbiddenError extends RequestError {
  static get status (): StatusCode {
    return StatusCode.Forbidden
  }

  constructor (message: string) {
    super(message)

    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends RequestError {
  static get status (): StatusCode {
    return StatusCode.NotFound
  }

  constructor () {
    super('')

    this.name = 'NotFoundError'
  }
}

export class MethodNotAllowedError extends RequestError {
  static get status (): StatusCode {
    return StatusCode.MethodNotAllowed
  }

  constructor () {
    super('')

    this.name = 'MethodNotAllowedError'
  }
}

export class NotAcceptableError extends RequestError {
  static get status (): StatusCode {
    return StatusCode.NotAcceptable
  }

  constructor (message: string) {
    super(message)

    this.name = 'NotAcceptableError'
  }
}

export class ProxyAuthenticationRequiredError extends RequestError {
  static get status (): StatusCode {
    return StatusCode.ProxyAuthenticationRequired
  }

  constructor (message: string) {
    super(message)

    this.name = 'ProxyAuthenticationRequiredError'
  }
}

export class RequestTimeoutError extends RequestError {
  static get status (): StatusCode {
    return StatusCode.RequestTimeout
  }

  constructor (message: string) {
    super(message)

    this.name = 'RequestTimeoutError'
  }
}

export class ConflictError extends RequestError {
  static get status (): StatusCode {
    return StatusCode.Conflict
  }

  constructor (message: string) {
    super(message)

    this.name = 'ConflictError'
  }
}

export class GoneError extends RequestError {
  static get status (): StatusCode {
    return StatusCode.Gone
  }

  constructor (message: string) {
    super(message)

    this.name = 'GoneError'
  }
}

export class LengthRequiredError extends RequestError {
  static get status (): StatusCode {
    return StatusCode.LengthRequired
  }

  constructor (message: string) {
    super(message)

    this.name = 'LengthRequiredError'
  }
}

export class PreconditionFailedError extends RequestError {
  static get status (): StatusCode {
    return StatusCode.PreconditionFailed
  }

  constructor (message: string) {
    super(message)

    this.name = 'PreconditionFailedError'
  }
}

export class PayloadTooLargeError extends RequestError {
  static get status (): StatusCode {
    return StatusCode.PayloadTooLarge
  }

  constructor (message: string) {
    super(message)

    this.name = 'PayloadTooLargeError'
  }
}

export class UriTooLongError extends RequestError {
  static get status (): StatusCode {
    return StatusCode.UriTooLong
  }

  constructor (message: string) {
    super(message)

    this.name = 'UriTooLongError'
  }
}

export class UnsupportedMediaTypeError extends RequestError {
  static get status (): StatusCode {
    return StatusCode.UnsupportedMediaType
  }

  constructor (subject: string) {
    super(`Unsupported ${subject}`)

    this.name = 'UnsupportedMediaTypeError'
  }
}

export class RangeNotSatisfiableError extends RequestError {
  static get status (): StatusCode {
    return StatusCode.RangeNotSatisfiable
  }

  constructor (message: string) {
    super(message)

    this.name = 'RangeNotSatisfiableError'
  }
}

export class ExpectationFailedError extends RequestError {
  static get status (): StatusCode {
    return StatusCode.ExpectationFailed
  }

  constructor (message: string) {
    super(message)

    this.name = 'ExpectationFailedError'
  }
}

export class ImATeapotError extends RequestError {
  static get status (): StatusCode {
    return StatusCode.ImATeapot
  }

  constructor (message: string) {
    super(message)

    this.name = 'ImATeapotError'
  }
}

export class MisdirectedRequestError extends RequestError {
  static get status (): StatusCode {
    return StatusCode.MisdirectedRequest
  }

  constructor (message: string) {
    super(message)

    this.name = 'MisdirectedRequestError'
  }
}

export class UnprocessableContentError extends RequestError {
  static get status (): StatusCode {
    return StatusCode.UnprocessableContent
  }

  get output (): ErrorOutput {
    return JSON.parse(this.message)
  }

  constructor (errors: FormattedError[]) {
    super(JSON.stringify(errors))

    this.name = 'UnprocessableContentError'
  }
}

export class LockedError extends RequestError {
  static get status (): StatusCode {
    return StatusCode.Locked
  }

  constructor (message: string) {
    super(message)

    this.name = 'LockedError'
  }
}

export class FailedDependencyError extends RequestError {
  static get status (): StatusCode {
    return StatusCode.FailedDependency
  }

  constructor (message: string) {
    super(message)

    this.name = 'FailedDependencyError'
  }
}

export class TooEarlyError extends RequestError {
  static get status (): StatusCode {
    return StatusCode.TooEarly
  }

  constructor (message: string) {
    super(message)

    this.name = 'TooEarlyError'
  }
}

export class UpgradeRequiredError extends RequestError {
  static get status (): StatusCode {
    return StatusCode.UpgradeRequired
  }

  constructor (message: string) {
    super(message)

    this.name = 'UpgradeRequiredError'
  }
}

export class PreconditionRequiredError extends RequestError {
  static get status (): StatusCode {
    return StatusCode.PreconditionRequired
  }

  constructor (message: string) {
    super(message)

    this.name = 'PreconditionRequiredError'
  }
}

export class TooManyRequestsError extends RequestError {
  static get status (): StatusCode {
    return StatusCode.TooManyRequests
  }

  constructor (message: string) {
    super(message)

    this.name = 'TooManyRequestsError'
  }
}

export class RequestHeaderFieldsTooLargeError extends RequestError {
  static get status (): StatusCode {
    return StatusCode.RequestHeaderFieldsTooLarge
  }

  constructor (message: string) {
    super(message)

    this.name = 'RequestHeaderFieldsTooLargeError'
  }
}

export class UnavailableForLegalReasonsError extends RequestError {
  static get status (): StatusCode {
    return StatusCode.UnavailableForLegalReasons
  }

  constructor (message: string) {
    super(message)

    this.name = 'UnavailableForLegalReasonsError'
  }
}

// 5xx - Server Errors

export class InternalServerError extends RequestError {
  static get status (): StatusCode {
    return StatusCode.InternalServerError
  }

  constructor () {
    super('An internal server error occurred')

    this.name = 'InternalServerError'
  }
}

export class NotImplementedError extends RequestError {
  static get status (): StatusCode {
    return StatusCode.NotImplemented
  }

  constructor () {
    super('')

    this.name = 'NotImplementedError'
  }
}

export class BadGatewayError extends RequestError {
  static get status (): StatusCode {
    return StatusCode.BadGateway
  }

  constructor (message: string) {
    super(message)

    this.name = 'BadGatewayError'
  }
}

export class ServiceUnavailableError extends RequestError {
  static get status (): StatusCode {
    return StatusCode.ServiceUnavailable
  }

  constructor (message: string) {
    super(message)

    this.name = 'ServiceUnavailableError'
  }
}

export class GatewayTimeoutError extends RequestError {
  static get status (): StatusCode {
    return StatusCode.GatewayTimeout
  }

  constructor () {
    super('')

    this.name = 'GatewayTimeoutError'
  }
}

export class HTTPVersionNotSupportedError extends RequestError {
  static get status (): StatusCode {
    return StatusCode.HTTPVersionNotSupported
  }

  constructor (message: string) {
    super(message)

    this.name = 'HTTPVersionNotSupportedError'
  }
}

export class VariantAlsoNegotiatesError extends RequestError {
  static get status (): StatusCode {
    return StatusCode.VariantAlsoNegotiates
  }

  constructor (message: string) {
    super(message)

    this.name = 'VariantAlsoNegotiatesError'
  }
}

export class InsufficientStorageError extends RequestError {
  static get status (): StatusCode {
    return StatusCode.InsufficientStorage
  }

  constructor (message: string) {
    super(message)

    this.name = 'InsufficientStorageError'
  }
}

export class LoopDetectedError extends RequestError {
  static get status (): StatusCode {
    return StatusCode.LoopDetected
  }

  constructor (message: string) {
    super(message)

    this.name = 'LoopDetectedError'
  }
}

export class NotExtendedError extends RequestError {
  static get status (): StatusCode {
    return StatusCode.NotExtended
  }

  constructor (message: string) {
    super(message)

    this.name = 'NotExtendedError'
  }
}

export class NetworkAuthenticationRequiredError extends RequestError {
  static get status (): StatusCode {
    return StatusCode.NetworkAuthenticationRequired
  }

  constructor (message: string) {
    super(message)

    this.name = 'NetworkAuthenticationRequiredError'
  }
}
