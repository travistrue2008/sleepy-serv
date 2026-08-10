import type { NextFn, Request } from '../../../../../src'

type Accum = {
  output: string
}

function middleware (
  _req: Request,
  res: Accum,
  next: NextFn,
): Response | Promise<Response> {
  return next({
    ...res,
    output: 'module',
  })
}

export default [
  middleware,
  (_req: Request, res: Accum) => new Response(res.output),
]
