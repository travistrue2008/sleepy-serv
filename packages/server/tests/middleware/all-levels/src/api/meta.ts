import type { NextFn, Request } from 'sleepy-serv'

type Accum = {
  list: string[]
}

export const middleware = [
  (_req: Request, res: Accum, next: NextFn) => next({
    ...res,
    list: [
      ...res.list,
      'parent-meta',
    ],
  }),
]
