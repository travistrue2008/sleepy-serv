import { UnprocessableContentError } from '../../../../../src/errors'

export default function (_req) {
  throw new UnprocessableContentError([
    {
      path: 'body',
      message: `must have required property 'firstName'`,
    },
  ])
}
