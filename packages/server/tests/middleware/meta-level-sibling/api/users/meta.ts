import type { NextFn, Request } from '../../../../../src'

type Accum = {
  output: string
}

export const middleware = [
  (_req: Request, res: Accum, next: NextFn) => next({
    ...res,
    output: 'sibling-meta',
  }),
]
