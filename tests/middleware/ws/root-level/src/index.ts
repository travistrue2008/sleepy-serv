import { createApp } from 'sleepy-serv'

import type { NextFn, HandlerResult, Request } from 'sleepy-serv'

function root (req: Request, _res: unknown, next: NextFn): HandlerResult {
  if (req.query.err !== undefined) {
    throw new Error('Middleware error triggered')
  }

  return next(['From root middleware'])
}

createApp(0, {
  ws: true,
  middleware: [root],
})

