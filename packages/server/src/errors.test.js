/*
 * This test file exists to get around bun's current lack in functionality for
 * skipping tests.
 */

import { describe, test, expect } from 'bun:test'

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

    expect(BadRequestError.status).toBe(400)
    expect(fn).toThrow(new BadRequestError('Bad'))
  })
})

describe('UnauthorizedError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new UnauthorizedError('Bad')
    }

    expect(UnauthorizedError.status).toBe(401)
    expect(fn).toThrow(new UnauthorizedError('Bad'))
  })
})

describe('PaymentRequiredError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new PaymentRequiredError('Bad')
    }

    expect(PaymentRequiredError.status).toBe(402)
    expect(fn).toThrow(new PaymentRequiredError('Bad'))
  })
})

describe('ForbiddenError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new ForbiddenError('Bad')
    }

    expect(ForbiddenError.status).toBe(403)
    expect(fn).toThrow(new ForbiddenError('Bad'))
  })
})

describe('NotFoundError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new NotFoundError('Bad')
    }

    expect(NotFoundError.status).toBe(404)
    expect(fn).toThrow(new NotFoundError('Bad'))
  })
})

describe('MethodNotAllowedError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new MethodNotAllowedError('Bad')
    }

    expect(MethodNotAllowedError.status).toBe(405)
    expect(fn).toThrow(new MethodNotAllowedError('Bad'))
  })
})

describe('NotAcceptableError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new NotAcceptableError('Bad')
    }

    expect(NotAcceptableError.status).toBe(406)
    expect(fn).toThrow(new NotAcceptableError('Bad'))
  })
})

describe('ProxyAuthenticationRequiredError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new ProxyAuthenticationRequiredError('Bad')
    }

    expect(ProxyAuthenticationRequiredError.status).toBe(407)
    expect(fn).toThrow(new ProxyAuthenticationRequiredError('Bad'))
  })
})

describe('RequestTimeoutError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new UnauthorizedError('Bad')
    }

    expect(RequestTimeoutError.status).toBe(408)
    expect(fn).toThrow(new RequestTimeoutError('Bad'))
  })
})

describe('ConflictError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new ConflictError('Bad')
    }

    expect(ConflictError.status).toBe(409)
    expect(fn).toThrow(new ConflictError('Bad'))
  })
})

describe('GoneError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new GoneError('Bad')
    }

    expect(GoneError.status).toBe(410)
    expect(fn).toThrow(new GoneError('Bad'))
  })
})

describe('LengthRequiredError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new LengthRequiredError('Bad')
    }

    expect(LengthRequiredError.status).toBe(411)
    expect(fn).toThrow(new LengthRequiredError('Bad'))
  })
})

describe('PreconditionFailedError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new PreconditionFailedError('Bad')
    }

    expect(PreconditionFailedError.status).toBe(412)
    expect(fn).toThrow(new PreconditionFailedError('Bad'))
  })
})

describe('PayloadTooLargeError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new PayloadTooLargeError('Bad')
    }

    expect(PayloadTooLargeError.status).toBe(413)
    expect(fn).toThrow(new PayloadTooLargeError('Bad'))
  })
})

describe('UriTooLongError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new UriTooLongError('Bad')
    }

    expect(UriTooLongError.status).toBe(414)
    expect(fn).toThrow(new UriTooLongError('Bad'))
  })
})

describe('UnsupportedMediaTypeError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new UnsupportedMediaTypeError('Bad')
    }

    expect(UnsupportedMediaTypeError.status).toBe(415)
    expect(fn).toThrow(new UnsupportedMediaTypeError('Bad'))
  })
})

describe('RangeNotSatisfiableError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new RangeNotSatisfiableError('Bad')
    }

    expect(RangeNotSatisfiableError.status).toBe(416)
    expect(fn).toThrow(new RangeNotSatisfiableError('Bad'))
  })
})

describe('ExpectationFailedError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new ExpectationFailedError('Bad')
    }

    expect(ExpectationFailedError.status).toBe(417)
    expect(fn).toThrow(new ExpectationFailedError('Bad'))
  })
})

describe('ImATeapotError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new ImATeapotError('Bad')
    }

    expect(fn).toThrow(new ImATeapotError('Bad'))
    expect(ImATeapotError.status).toBe(418)
  })
})

describe('MisdirectedRequestError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new MisdirectedRequestError('Bad')
    }

    expect(MisdirectedRequestError.status).toBe(421)
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

    expect(UnprocessableContentError.status).toBe(422)
    expect(fn).toThrow(new UnprocessableContentError(ERRORS))
  })
})

describe('LockedError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new LockedError('Bad')
    }

    expect(LockedError.status).toBe(423)
    expect(fn).toThrow(new LockedError('Bad'))
  })
})

describe('FailedDependencyError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new FailedDependencyError('Bad')
    }

    expect(FailedDependencyError.status).toBe(424)
    expect(fn).toThrow(new FailedDependencyError('Bad'))
  })
})

describe('TooEarlyError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new TooEarlyError('Bad')
    }

    expect(TooEarlyError.status).toBe(425)
    expect(fn).toThrow(new TooEarlyError('Bad'))
  })
})

describe('UpgradeRequiredError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new UpgradeRequiredError('Bad')
    }

    expect(UpgradeRequiredError.status).toBe(426)
    expect(fn).toThrow(new UpgradeRequiredError('Bad'))
  })
})

describe('PreconditionRequiredError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new PreconditionRequiredError('Bad')
    }

    expect(PreconditionRequiredError.status).toBe(428)
    expect(fn).toThrow(new PreconditionRequiredError('Bad'))
  })
})

describe('TooManyRequestsError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new TooManyRequestsError('Bad')
    }

    expect(TooManyRequestsError.status).toBe(429)
    expect(fn).toThrow(new TooManyRequestsError('Bad'))
  })
})

describe('RequestHeaderFieldsTooLargeError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new RequestHeaderFieldsTooLargeError('Bad')
    }

    expect(RequestHeaderFieldsTooLargeError.status).toBe(431)
    expect(fn).toThrow(new RequestHeaderFieldsTooLargeError('Bad'))
  })
})

describe('UnavailableForLegalReasonsError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new UnavailableForLegalReasonsError('Bad')
    }

    expect(UnavailableForLegalReasonsError.status).toBe(451)
    expect(fn).toThrow(new UnavailableForLegalReasonsError('Bad'))
  })
})

// 5xx - Server Errors

describe('InternalServerError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new InternalServerError('Bad')
    }

    expect(InternalServerError.status).toBe(500)
    expect(fn).toThrow(new InternalServerError('Bad'))
  })
})

describe('NotImplementedError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new NotImplementedError('Bad')
    }

    expect(NotImplementedError.status).toBe(501)
    expect(fn).toThrow(new NotImplementedError('Bad'))
  })
})

describe('BadGatewayError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new BadGatewayError('Bad')
    }

    expect(BadGatewayError.status).toBe(502)
    expect(fn).toThrow(new BadGatewayError('Bad'))
  })
})

describe('ServiceUnavailableError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new ServiceUnavailableError('Bad')
    }

    expect(ServiceUnavailableError.status).toBe(503)
    expect(fn).toThrow(new ServiceUnavailableError('Bad'))
  })
})

describe('GatewayTimeoutError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new GatewayTimeoutError('Bad')
    }

    expect(GatewayTimeoutError.status).toBe(504)
    expect(fn).toThrow(new GatewayTimeoutError('Bad'))
  })
})

describe('HTTPVersionNotSupportedError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new HTTPVersionNotSupportedError('Bad')
    }

    expect(HTTPVersionNotSupportedError.status).toBe(505)
    expect(fn).toThrow(new HTTPVersionNotSupportedError('Bad'))
  })
})

describe('VariantAlsoNegotiatesError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new VariantAlsoNegotiatesError('Bad')
    }

    expect(VariantAlsoNegotiatesError.status).toBe(506)
    expect(fn).toThrow(new VariantAlsoNegotiatesError('Bad'))
  })
})

describe('InsufficientStorageError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new InsufficientStorageError('Bad')
    }

    expect(InsufficientStorageError.status).toBe(507)
    expect(fn).toThrow(new InsufficientStorageError('Bad'))
  })
})

describe('LoopDetectedError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new LoopDetectedError('Bad')
    }

    expect(LoopDetectedError.status).toBe(508)
    expect(fn).toThrow(new LoopDetectedError('Bad'))
  })
})

describe('NotExtendedError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new NotExtendedError('Bad')
    }

    expect(NotExtendedError.status).toBe(510)
    expect(fn).toThrow(new NotExtendedError('Bad'))
  })
})

describe('NetworkAuthenticationRequiredError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new NetworkAuthenticationRequiredError('Bad')
    }

    expect(NetworkAuthenticationRequiredError.status).toBe(511)
    expect(fn).toThrow(new NetworkAuthenticationRequiredError('Bad'))
  })
})
