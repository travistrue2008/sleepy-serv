import type { NextFn, Request } from 'sleepy-serv'

export const middleware = [
  (req: Request, _res: unknown, next: NextFn): Response | Promise<Response> => {
    if (req.query.err === 'lvl_1') {
      throw new Error('Error Lvl 1')
    }

    return next(['a'])
  },
]
