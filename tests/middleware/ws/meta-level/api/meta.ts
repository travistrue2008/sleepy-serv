import type { NextFn, HandlerResult, Request } from 'sleepy-serv'

export const middleware = [
  (req: Request, _res: unknown, next: NextFn): HandlerResult => {
    if (req.query.err === 'lvl_1') {
      throw new Error('Error Lvl 1')
    }

    return next(['a'])
  },
]
