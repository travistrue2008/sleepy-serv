/*
 * This test file exists to get around bun's current lack in functionality for
 * skipping tests.
 */

import { describe, test, expect } from 'bun:test'
import { StatusCode } from './status'

import {
  RequestError,
  BadRequestError,
  UnauthorizedError,
  PaymentRequiredError,
  ForbiddenError,
  NotFoundError,
  MethodNotAllowedError,
  NotAcceptableError,
  ProxyAuthenticationRequiredError,
  RequestTimeoutError,
  ConflictError,
  GoneError,
  LengthRequiredError,
  PreconditionFailedError,
  PayloadTooLargeError,
  UriTooLongError,
  UnsupportedMediaTypeError,
  RangeNotSatisfiableError,
  ExpectationFailedError,
  ImATeapotError,
  MisdirectedRequestError,
  UnprocessableContentError,
  LockedError,
  FailedDependencyError,
  TooEarlyError,
  UpgradeRequiredError,
  PreconditionRequiredError,
  TooManyRequestsError,
  RequestHeaderFieldsTooLargeError,
  UnavailableForLegalReasonsError,
  InternalServerError,
  NotImplementedError,
  BadGatewayError,
  ServiceUnavailableError,
  GatewayTimeoutError,
  HTTPVersionNotSupportedError,
  VariantAlsoNegotiatesError,
  InsufficientStorageError,
  LoopDetectedError,
  NotExtendedError,
  NetworkAuthenticationRequiredError,
} from './errors'

// Base Error

describe('RequestError', () => {
  test('when "status" is invoked', () => {
    const fn = () => RequestError.status

    expect(fn).toThrow(new Error('Unimplemented'))
  })

  test('when "output" is invoked', () => {
    const err = new RequestError('Bad')

    expect(err.output).toStrictEqual({
      message: 'Bad',
    })
  })

  test('when thrown', () => {
    const fn = () => {
      throw new RequestError('Bad')
    }

    expect(fn).toThrow(new RequestError('Bad'))
  })
})

// 4xx - Client Errors

describe('BadRequestError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new BadRequestError('Bad')
    }

    expect(BadRequestError.status).toBe(StatusCode.BadRequest)
    expect(fn).toThrow(new BadRequestError('Bad'))
  })
})

describe('UnauthorizedError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new UnauthorizedError('Bad')
    }

    expect(UnauthorizedError.status).toBe(StatusCode.Unauthorized)
    expect(fn).toThrow(new UnauthorizedError('Bad'))
  })
})

describe('PaymentRequiredError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new PaymentRequiredError('Bad')
    }

    expect(PaymentRequiredError.status).toBe(StatusCode.PaymentRequired)
    expect(fn).toThrow(new PaymentRequiredError('Bad'))
  })
})

describe('ForbiddenError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new ForbiddenError('Bad')
    }

    expect(ForbiddenError.status).toBe(StatusCode.Forbidden)
    expect(fn).toThrow(new ForbiddenError('Bad'))
  })
})

describe('NotFoundError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new NotFoundError()
    }

    expect(NotFoundError.status).toBe(StatusCode.NotFound)
    expect(fn).toThrow(new NotFoundError())
  })
})

describe('MethodNotAllowedError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new MethodNotAllowedError()
    }

    expect(MethodNotAllowedError.status).toBe(StatusCode.MethodNotAllowed)
    expect(fn).toThrow(new MethodNotAllowedError())
  })
})

describe('NotAcceptableError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new NotAcceptableError('Bad')
    }

    expect(NotAcceptableError.status).toBe(StatusCode.NotAcceptable)
    expect(fn).toThrow(new NotAcceptableError('Bad'))
  })
})

describe('ProxyAuthenticationRequiredError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new ProxyAuthenticationRequiredError('Bad')
    }

    expect(ProxyAuthenticationRequiredError.status)
      .toBe(StatusCode.ProxyAuthenticationRequired)

    expect(fn).toThrow(new ProxyAuthenticationRequiredError('Bad'))
  })
})

describe('RequestTimeoutError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new UnauthorizedError('Bad')
    }

    expect(RequestTimeoutError.status).toBe(StatusCode.RequestTimeout)
    expect(fn).toThrow(new RequestTimeoutError('Bad'))
  })
})

describe('ConflictError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new ConflictError('Bad')
    }

    expect(ConflictError.status).toBe(StatusCode.Conflict)
    expect(fn).toThrow(new ConflictError('Bad'))
  })
})

describe('GoneError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new GoneError('Bad')
    }

    expect(GoneError.status).toBe(StatusCode.Gone)
    expect(fn).toThrow(new GoneError('Bad'))
  })
})

describe('LengthRequiredError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new LengthRequiredError('Bad')
    }

    expect(LengthRequiredError.status).toBe(StatusCode.LengthRequired)
    expect(fn).toThrow(new LengthRequiredError('Bad'))
  })
})

describe('PreconditionFailedError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new PreconditionFailedError('Bad')
    }

    expect(PreconditionFailedError.status).toBe(StatusCode.PreconditionFailed)
    expect(fn).toThrow(new PreconditionFailedError('Bad'))
  })
})

describe('PayloadTooLargeError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new PayloadTooLargeError('Bad')
    }

    expect(PayloadTooLargeError.status).toBe(StatusCode.PayloadTooLarge)
    expect(fn).toThrow(new PayloadTooLargeError('Bad'))
  })
})

describe('UriTooLongError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new UriTooLongError('Bad')
    }

    expect(UriTooLongError.status).toBe(StatusCode.UriTooLong)
    expect(fn).toThrow(new UriTooLongError('Bad'))
  })
})

describe('UnsupportedMediaTypeError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new UnsupportedMediaTypeError('Bad')
    }

    expect(UnsupportedMediaTypeError.status)
      .toBe(StatusCode.UnsupportedMediaType)

    expect(fn).toThrow(new UnsupportedMediaTypeError('Bad'))
  })
})

describe('RangeNotSatisfiableError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new RangeNotSatisfiableError('Bad')
    }

    expect(RangeNotSatisfiableError.status).toBe(StatusCode.RangeNotSatisfiable)
    expect(fn).toThrow(new RangeNotSatisfiableError('Bad'))
  })
})

describe('ExpectationFailedError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new ExpectationFailedError('Bad')
    }

    expect(ExpectationFailedError.status).toBe(StatusCode.ExpectationFailed)
    expect(fn).toThrow(new ExpectationFailedError('Bad'))
  })
})

describe('ImATeapotError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new ImATeapotError('Bad')
    }

    expect(fn).toThrow(new ImATeapotError('Bad'))
    expect(ImATeapotError.status).toBe(StatusCode.ImATeapot)
  })
})

describe('MisdirectedRequestError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new MisdirectedRequestError('Bad')
    }

    expect(MisdirectedRequestError.status).toBe(StatusCode.MisdirectedRequest)
    expect(fn).toThrow(new MisdirectedRequestError('Bad'))
  })
})

describe('UnprocessableContentError', () => {
  const ERRORS = [
    {
      path: 'id',
      message: 'Invalid',
    },
  ]

  test('when "output" is invoked', () => {
    const err = new UnprocessableContentError(ERRORS)

    expect(err.output).toStrictEqual(ERRORS)
  })

  test('when thrown', () => {
    const fn = () => {
      throw new UnprocessableContentError(ERRORS)
    }

    expect(UnprocessableContentError.status)
      .toBe(StatusCode.UnprocessableContent)

    expect(fn).toThrow(new UnprocessableContentError(ERRORS))
  })
})

describe('LockedError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new LockedError('Bad')
    }

    expect(LockedError.status).toBe(StatusCode.Locked)
    expect(fn).toThrow(new LockedError('Bad'))
  })
})

describe('FailedDependencyError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new FailedDependencyError('Bad')
    }

    expect(FailedDependencyError.status).toBe(StatusCode.FailedDependency)
    expect(fn).toThrow(new FailedDependencyError('Bad'))
  })
})

describe('TooEarlyError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new TooEarlyError('Bad')
    }

    expect(TooEarlyError.status).toBe(StatusCode.TooEarly)
    expect(fn).toThrow(new TooEarlyError('Bad'))
  })
})

describe('UpgradeRequiredError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new UpgradeRequiredError('Bad')
    }

    expect(UpgradeRequiredError.status).toBe(StatusCode.UpgradeRequired)
    expect(fn).toThrow(new UpgradeRequiredError('Bad'))
  })
})

describe('PreconditionRequiredError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new PreconditionRequiredError('Bad')
    }

    expect(PreconditionRequiredError.status)
      .toBe(StatusCode.PreconditionRequired)

    expect(fn).toThrow(new PreconditionRequiredError('Bad'))
  })
})

describe('TooManyRequestsError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new TooManyRequestsError('Bad')
    }

    expect(TooManyRequestsError.status).toBe(StatusCode.TooManyRequests)
    expect(fn).toThrow(new TooManyRequestsError('Bad'))
  })
})

describe('RequestHeaderFieldsTooLargeError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new RequestHeaderFieldsTooLargeError('Bad')
    }

    expect(RequestHeaderFieldsTooLargeError.status)
      .toBe(StatusCode.RequestHeaderFieldsTooLarge)

    expect(fn).toThrow(new RequestHeaderFieldsTooLargeError('Bad'))
  })
})

describe('UnavailableForLegalReasonsError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new UnavailableForLegalReasonsError('Bad')
    }

    expect(UnavailableForLegalReasonsError.status)
      .toBe(StatusCode.UnavailableForLegalReasons)

    expect(fn).toThrow(new UnavailableForLegalReasonsError('Bad'))
  })
})

// 5xx - Server Errors

describe('InternalServerError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new InternalServerError('Bad')
    }

    expect(InternalServerError.status).toBe(StatusCode.InternalServerError)
    expect(fn).toThrow(new InternalServerError('Bad'))
  })
})

describe('NotImplementedError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new NotImplementedError()
    }

    expect(NotImplementedError.status).toBe(StatusCode.NotImplemented)
    expect(fn).toThrow(new NotImplementedError())
  })
})

describe('BadGatewayError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new BadGatewayError('Bad')
    }

    expect(BadGatewayError.status).toBe(StatusCode.BadGateway)
    expect(fn).toThrow(new BadGatewayError('Bad'))
  })
})

describe('ServiceUnavailableError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new ServiceUnavailableError('Bad')
    }

    expect(ServiceUnavailableError.status).toBe(StatusCode.ServiceUnavailable)
    expect(fn).toThrow(new ServiceUnavailableError('Bad'))
  })
})

describe('GatewayTimeoutError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new GatewayTimeoutError()
    }

    expect(GatewayTimeoutError.status).toBe(StatusCode.GatewayTimeout)
    expect(fn).toThrow(new GatewayTimeoutError())
  })
})

describe('HTTPVersionNotSupportedError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new HTTPVersionNotSupportedError('Bad')
    }

    expect(HTTPVersionNotSupportedError.status)
      .toBe(StatusCode.HTTPVersionNotSupported)

    expect(fn).toThrow(new HTTPVersionNotSupportedError('Bad'))
  })
})

describe('VariantAlsoNegotiatesError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new VariantAlsoNegotiatesError('Bad')
    }

    expect(VariantAlsoNegotiatesError.status)
      .toBe(StatusCode.VariantAlsoNegotiates)

    expect(fn).toThrow(new VariantAlsoNegotiatesError('Bad'))
  })
})

describe('InsufficientStorageError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new InsufficientStorageError('Bad')
    }

    expect(InsufficientStorageError.status).toBe(StatusCode.InsufficientStorage)
    expect(fn).toThrow(new InsufficientStorageError('Bad'))
  })
})

describe('LoopDetectedError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new LoopDetectedError('Bad')
    }

    expect(LoopDetectedError.status).toBe(StatusCode.LoopDetected)
    expect(fn).toThrow(new LoopDetectedError('Bad'))
  })
})

describe('NotExtendedError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new NotExtendedError('Bad')
    }

    expect(NotExtendedError.status).toBe(StatusCode.NotExtended)
    expect(fn).toThrow(new NotExtendedError('Bad'))
  })
})

describe('NetworkAuthenticationRequiredError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new NetworkAuthenticationRequiredError('Bad')
    }

    expect(NetworkAuthenticationRequiredError.status)
      .toBe(StatusCode.NetworkAuthenticationRequired)

    expect(fn).toThrow(new NetworkAuthenticationRequiredError('Bad'))
  })
})
