import type { NextFn, HandlerResult, Request } from 'sleepy-serv'

export const middleware = [
  (req: Request, res: string[], next: NextFn): HandlerResult => {
    if (req.query.err === 'lvl_3') {
      throw new Error('Error Lvl 3')
    }

    return next([...res, 'c'])
  },
]
