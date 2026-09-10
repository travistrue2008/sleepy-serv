import { UnprocessableContentError } from 'sleepy-serv'

import type { Request } from 'sleepy-serv'

export default function (_req: Request): never {
  throw new UnprocessableContentError([
    {
      path: 'body',
      message: `must have required property 'firstName'`,
    },
  ])
}
