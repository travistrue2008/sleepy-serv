import type { NextFn, Request } from 'sleepy-serv'

export const middleware = [
  (req: Request, res: string[], next: NextFn): Response | Promise<Response> => {
    if (req.query.err === 'lvl_2') {
      throw new Error('Error Lvl 2')
    }

    return next([...res, 'b'])
  },
]
