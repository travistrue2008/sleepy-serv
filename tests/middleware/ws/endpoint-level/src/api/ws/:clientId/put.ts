import type { NextFn, HandlerResult, Request } from 'sleepy-serv'

export default function (
  req: Request,
  _res: unknown,
  next: NextFn,
): HandlerResult {
  if (req.query.err !== undefined) {
    throw new Error('Error from PUT middleware')
  }

  return next({
    message: 'PUT - successful',
  })
}
