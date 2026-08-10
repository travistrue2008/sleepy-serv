import type { NextFn, Request } from '../../../../../src'

type Accum = {
  list: string[]
}

export const middleware = [
  (_req: Request, res: Accum, next: NextFn) => next({
    ...res,
    list: [
      ...res.list,
      'sibling-meta',
    ],
  }),
]
