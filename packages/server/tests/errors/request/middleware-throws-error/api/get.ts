/* istanbul ignore file */

import type { Request } from '../../../../../src'

export default [
  (_req: Request) => {
    throw new Error('Bad')
  },
  /* Unreachable. This is here to make the previous function middleware */
  /* istanbul ignore next */
  (_req: Request) => {
    return new Response('Hello world')
  },
]
