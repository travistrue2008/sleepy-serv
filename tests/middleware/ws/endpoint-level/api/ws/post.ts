import type { NextFn, Request } from 'sleepy-serv'

export default function (
  req: Request,
  _res: unknown,
  next: NextFn,
): Response | Promise<Response> {
  if (req.query.err !== undefined) {
    throw new Error('Error from POST middleware')
  }

  return next({
    message: 'POST - successful',
  })
}
