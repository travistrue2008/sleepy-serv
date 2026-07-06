/*
 * This test file exists to get around bun's current lack in functionality for
 * skipping tests.
 */

import {
  describe,
  test,
  expect,
} from 'bun:test'

import {
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

// 4xx - Client Errors

describe('BadRequestError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new BadRequestError('bad')
    }

    expect(fn).toThrow(new BadRequestError('bad'))
    expect(BadRequestError.statusCode).toBe(400)
  })
})

describe('UnauthorizedError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new UnauthorizedError('bad')
    }

    expect(fn).toThrow(new UnauthorizedError('bad'))
    expect(UnauthorizedError.statusCode).toBe(401)
  })
})

describe('PaymentRequiredError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new PaymentRequiredError('bad')
    }

    expect(fn).toThrow(new PaymentRequiredError('bad'))
    expect(PaymentRequiredError.statusCode).toBe(402)
  })
})

describe('ForbiddenError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new ForbiddenError('bad')
    }

    expect(fn).toThrow(new ForbiddenError('bad'))
    expect(ForbiddenError.statusCode).toBe(403)
  })
})

describe('NotFoundError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new NotFoundError('bad')
    }

    expect(fn).toThrow(new NotFoundError('bad'))
    expect(NotFoundError.statusCode).toBe(404)
  })
})

describe('MethodNotAllowedError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new MethodNotAllowedError('bad')
    }

    expect(fn).toThrow(new MethodNotAllowedError('bad'))
    expect(MethodNotAllowedError.statusCode).toBe(405)
  })
})

describe('NotAcceptableError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new NotAcceptableError('bad')
    }

    expect(fn).toThrow(new NotAcceptableError('bad'))
    expect(NotAcceptableError.statusCode).toBe(406)
  })
})

describe('ProxyAuthenticationRequiredError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new ProxyAuthenticationRequiredError('bad')
    }

    expect(fn).toThrow(new ProxyAuthenticationRequiredError('bad'))
    expect(ProxyAuthenticationRequiredError.statusCode).toBe(407)
  })
})

describe('RequestTimeoutError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new UnauthorizedError('bad')
    }

    expect(fn).toThrow(new RequestTimeoutError('bad'))
    expect(RequestTimeoutError.statusCode).toBe(408)
  })
})

describe('ConflictError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new ConflictError('bad')
    }

    expect(fn).toThrow(new ConflictError('bad'))
    expect(ConflictError.statusCode).toBe(409)
  })
})

describe('GoneError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new GoneError('bad')
    }

    expect(fn).toThrow(new GoneError('bad'))
    expect(GoneError.statusCode).toBe(410)
  })
})

describe('LengthRequiredError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new LengthRequiredError('bad')
    }

    expect(fn).toThrow(new LengthRequiredError('bad'))
    expect(LengthRequiredError.statusCode).toBe(411)
  })
})

describe('PreconditionFailedError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new PreconditionFailedError('bad')
    }

    expect(fn).toThrow(new PreconditionFailedError('bad'))
    expect(PreconditionFailedError.statusCode).toBe(412)
  })
})

describe('PayloadTooLargeError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new PayloadTooLargeError('bad')
    }

    expect(fn).toThrow(new PayloadTooLargeError('bad'))
    expect(PayloadTooLargeError.statusCode).toBe(413)
  })
})

describe('UriTooLongError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new UriTooLongError('bad')
    }

    expect(fn).toThrow(new UriTooLongError('bad'))
    expect(UriTooLongError.statusCode).toBe(414)
  })
})

describe('UnsupportedMediaTypeError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new UnsupportedMediaTypeError('bad')
    }

    expect(fn).toThrow(new UnsupportedMediaTypeError('bad'))
    expect(UnsupportedMediaTypeError.statusCode).toBe(415)
  })
})

describe('RangeNotSatisfiableError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new RangeNotSatisfiableError('bad')
    }

    expect(fn).toThrow(new RangeNotSatisfiableError('bad'))
    expect(RangeNotSatisfiableError.statusCode).toBe(416)
  })
})

describe('ExpectationFailedError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new ExpectationFailedError('bad')
    }

    expect(fn).toThrow(new ExpectationFailedError('bad'))
    expect(ExpectationFailedError.statusCode).toBe(417)
  })
})

describe('ImATeapotError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new ImATeapotError('bad')
    }

    expect(fn).toThrow(new ImATeapotError('bad'))
    expect(ImATeapotError.statusCode).toBe(418)
  })
})

describe('MisdirectedRequestError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new MisdirectedRequestError('bad')
    }

    expect(fn).toThrow(new MisdirectedRequestError('bad'))
    expect(MisdirectedRequestError.statusCode).toBe(421)
  })
})

describe('UnprocessableContentError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new UnprocessableContentError('bad')
    }

    expect(fn).toThrow(new UnprocessableContentError('bad'))
    expect(UnprocessableContentError.statusCode).toBe(422)
  })
})

describe('LockedError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new LockedError('bad')
    }

    expect(fn).toThrow(new LockedError('bad'))
    expect(LockedError.statusCode).toBe(423)
  })
})

describe('FailedDependencyError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new FailedDependencyError('bad')
    }

    expect(fn).toThrow(new FailedDependencyError('bad'))
    expect(FailedDependencyError.statusCode).toBe(424)
  })
})

describe('TooEarlyError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new TooEarlyError('bad')
    }

    expect(fn).toThrow(new TooEarlyError('bad'))
    expect(TooEarlyError.statusCode).toBe(425)
  })
})

describe('UpgradeRequiredError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new UpgradeRequiredError('bad')
    }

    expect(fn).toThrow(new UpgradeRequiredError('bad'))
    expect(UpgradeRequiredError.statusCode).toBe(426)
  })
})

describe('PreconditionRequiredError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new PreconditionRequiredError('bad')
    }

    expect(fn).toThrow(new PreconditionRequiredError('bad'))
    expect(PreconditionRequiredError.statusCode).toBe(428)
  })
})

describe('TooManyRequestsError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new TooManyRequestsError('bad')
    }

    expect(fn).toThrow(new TooManyRequestsError('bad'))
    expect(TooManyRequestsError.statusCode).toBe(429)
  })
})

describe('RequestHeaderFieldsTooLargeError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new RequestHeaderFieldsTooLargeError('bad')
    }

    expect(fn).toThrow(new RequestHeaderFieldsTooLargeError('bad'))
    expect(RequestHeaderFieldsTooLargeError.statusCode).toBe(431)
  })
})

describe('UnavailableForLegalReasonsError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new UnavailableForLegalReasonsError('bad')
    }

    expect(fn).toThrow(new UnavailableForLegalReasonsError('bad'))
    expect(UnavailableForLegalReasonsError.statusCode).toBe(451)
  })
})

// 5xx - Server Errors

describe('InternalServerError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new InternalServerError('bad')
    }

    expect(fn).toThrow(new InternalServerError('bad'))
    expect(InternalServerError.statusCode).toBe(500)
  })
})

describe('NotImplementedError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new NotImplementedError('bad')
    }

    expect(fn).toThrow(new NotImplementedError('bad'))
    expect(NotImplementedError.statusCode).toBe(501)
  })
})

describe('BadGatewayError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new BadGatewayError('bad')
    }

    expect(fn).toThrow(new BadGatewayError('bad'))
    expect(BadGatewayError.statusCode).toBe(502)
  })
})

describe('ServiceUnavailableError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new ServiceUnavailableError('bad')
    }

    expect(fn).toThrow(new ServiceUnavailableError('bad'))
    expect(ServiceUnavailableError.statusCode).toBe(503)
  })
})

describe('GatewayTimeoutError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new GatewayTimeoutError('bad')
    }

    expect(fn).toThrow(new GatewayTimeoutError('bad'))
    expect(GatewayTimeoutError.statusCode).toBe(504)
  })
})

describe('HTTPVersionNotSupportedError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new HTTPVersionNotSupportedError('bad')
    }

    expect(fn).toThrow(new HTTPVersionNotSupportedError('bad'))
    expect(HTTPVersionNotSupportedError.statusCode).toBe(505)
  })
})

describe('VariantAlsoNegotiatesError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new VariantAlsoNegotiatesError('bad')
    }

    expect(fn).toThrow(new VariantAlsoNegotiatesError('bad'))
    expect(VariantAlsoNegotiatesError.statusCode).toBe(506)
  })
})

describe('InsufficientStorageError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new InsufficientStorageError('bad')
    }

    expect(fn).toThrow(new InsufficientStorageError('bad'))
    expect(InsufficientStorageError.statusCode).toBe(507)
  })
})

describe('LoopDetectedError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new LoopDetectedError('bad')
    }

    expect(fn).toThrow(new LoopDetectedError('bad'))
    expect(LoopDetectedError.statusCode).toBe(508)
  })
})

describe('NotExtendedError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new NotExtendedError('bad')
    }

    expect(fn).toThrow(new NotExtendedError('bad'))
    expect(NotExtendedError.statusCode).toBe(510)
  })
})

describe('NetworkAuthenticationRequiredError', () => {
  test('when thrown', () => {
    const fn = () => {
      throw new NetworkAuthenticationRequiredError('bad')
    }

    expect(fn).toThrow(new NetworkAuthenticationRequiredError('bad'))
    expect(NetworkAuthenticationRequiredError.statusCode).toBe(511)
  })
})
