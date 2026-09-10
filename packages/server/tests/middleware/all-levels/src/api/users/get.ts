import type { NextFn, Request } from 'sleepy-serv'

type Accum = {
  list: string[]
}

export default [
  (_req: Request, res: Accum, next: NextFn) => next({
    ...res,
    list: [
      ...res.list,
      'module',
    ],
  }),
  (_req: Request, res: Accum) => new Response(res.list.join('|')),
]
