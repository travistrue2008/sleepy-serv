import type { NextFn, HandlerResult, Request } from 'sleepy-serv'

type Accum = {
  output: string
}

function middleware (_req: Request, res: Accum, next: NextFn): HandlerResult {
  return next({
    ...res,
    output: 'module',
  })
}

export default [
  middleware,
  (_req: Request, res: Accum) => new Response(res.output),
]
