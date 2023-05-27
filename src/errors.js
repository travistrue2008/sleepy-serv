class RequestError extends Error {
  static get statusCode () {
    throw new Error('Error code unimplemented')
  }

  constructor (message) {
    super(message)

    this.name = 'RequestError'
  }
}

export class BadRequestError extends RequestError {
  static get statusCode () { return 400 }

  constructor (message) {
    super(message)

    this.name = 'BadRequestError'
  }
}

export class UnauthorizedError extends RequestError {
  static get statusCode () { return 401 }

  constructor (message) {
    super(message)

    this.name = 'UnauthorizedError'
  }
}

export class PaymentRequiredError extends RequestError {
  static get statusCode () { return 402 }

  constructor (message) {
    super(message)

    this.name = 'PaymentRequiredError'
  }
}

export class ForbiddenError extends RequestError {
  static get statusCode () { return 403 }

  constructor (message) {
    super(message)

    this.name = 'ForbiddenError'
  }
}

export class NotFoundError extends RequestError {
  static get statusCode () { return 404 }

  constructor (message) {
    super(message)

    this.name = 'NotFoundError'
  }
}

export class MethodNotAllowedError extends RequestError {
  static get statusCode () { return 405 }

  constructor (message) {
    super(message)

    this.name = 'MethodNotAllowedError'
  }
}

export class NotAcceptableError extends RequestError {
  static get statusCode () { return 406 }

  constructor (message) {
    super(message)

    this.name = 'NotAcceptableError'
  }
}

export class ProxyAuthenticationRequiredError extends RequestError {
  static get statusCode () { return 407 }

  constructor (message) {
    super(message)

    this.name = 'ProxyAuthenticationRequiredError'
  }
}

export class RequestTimeoutError extends RequestError {
  static get statusCode () { return 408 }

  constructor (message) {
    super(message)

    this.name = 'RequestTimeoutError'
  }
}

export class ConflictError extends RequestError {
  static get statusCode () { return 409 }

  constructor (message) {
    super(message)

    this.name = 'ConflictError'
  }
}

export class GoneError extends RequestError {
  static get statusCode () { return 410 }

  constructor (message) {
    super(message)

    this.name = 'GoneError'
  }
}

export class LengthRequiredError extends RequestError {
  static get statusCode () { return 411 }

  constructor (message) {
    super(message)

    this.name = 'LengthRequiredError'
  }
}

export class PreconditionFailedError extends RequestError {
  static get statusCode () { return 412 }

  constructor (message) {
    super(message)

    this.name = 'PreconditionFailedError'
  }
}

export class PayloadTooLargeError extends RequestError {
  static get statusCode () { return 413 }

  constructor (message) {
    super(message)

    this.name = 'PayloadTooLargeError'
  }
}

export class UriTooLongError extends RequestError {
  static get statusCode () { return 414 }

  constructor (message) {
    super(message)

    this.name = 'UriTooLongError'
  }
}

export class UnsupportedMediaTypeError extends RequestError {
  static get statusCode () { return 415 }

  constructor (message) {
    super(message)

    this.name = 'UnsupportedMediaTypeError'
  }
}

export class RangeNotSatisfiableError extends RequestError {
  static get statusCode () { return 416 }

  constructor (message) {
    super(message)

    this.name = 'RangeNotSatisfiableError'
  }
}

export class ExpectationFailedError extends RequestError {
  static get statusCode () { return 417 }

  constructor (message) {
    super(message)

    this.name = 'ExpectationFailedError'
  }
}

export class ImATeapotError extends RequestError {
  static get statusCode () { return 418 }

  constructor (message) {
    super(message)

    this.name = 'ImATeapotError'
  }
}

export class MisdirectedRequestError extends RequestError {
  static get statusCode () { return 421 }

  constructor (message) {
    super(message)

    this.name = 'MisdirectedRequestError'
  }
}

export class UnprocessableContentError extends RequestError {
  static get statusCode () { return 422 }

  constructor (message) {
    super(message)

    this.name = 'UnprocessableContentError'
  }
}

export class LockedError extends RequestError {
  static get statusCode () { return 423 }

  constructor (message) {
    super(message)

    this.name = 'LockedError'
  }
}

export class FailedDependencyError extends RequestError {
  static get statusCode () { return 424 }

  constructor (message) {
    super(message)

    this.name = 'FailedDependencyError'
  }
}

export class TooEarlyError extends RequestError {
  static get statusCode () { return 425 }

  constructor (message) {
    super(message)

    this.name = 'TooEarlyError'
  }
}

export class UpgradeRequiredError extends RequestError {
  static get statusCode () { return 426 }

  constructor (message) {
    super(message)

    this.name = 'UpgradeRequiredError'
  }
}

export class PreconditionRequiredError extends RequestError {
  static get statusCode () { return 428 }

  constructor (message) {
    super(message)

    this.name = 'PreconditionRequiredError'
  }
}

export class TooManyRequestsError extends RequestError {
  static get statusCode () { return 429 }

  constructor (message) {
    super(message)

    this.name = 'TooManyRequestsError'
  }
}

export class RequestHeaderFieldsTooLargeError extends RequestError {
  static get statusCode () { return 431 }

  constructor (message) {
    super(message)

    this.name = 'RequestHeaderFieldsTooLargeError'
  }
}

export class UnavailableForLegalReasonsError extends RequestError {
  static get statusCode () { return 451 }

  constructor (message) {
    super(message)

    this.name = 'UnavailableForLegalReasonsError'
  }
}
