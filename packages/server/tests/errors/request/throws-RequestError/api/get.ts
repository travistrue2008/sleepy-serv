import { UnprocessableContentError } from '../../../../../src/errors'

import type { Request } from '../../../../../src'

export default function (_req: Request): never {
  throw new UnprocessableContentError([
    {
      path: 'body',
      message: `must have required property 'firstName'`,
    },
  ])
}
