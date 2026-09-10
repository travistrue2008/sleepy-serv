import { createApp } from 'sleepy-serv'

import type { NextFn, HandlerResult, Request } from 'sleepy-serv'

function root (
  req: Request,
  _res: unknown,
  next: NextFn,
): HandlerResult {
  if (req.query.err !== undefined) {
    throw new Error('Error from root middleware')
  }

  return next(['From root middleware'])
}

createApp(0, {
  middleware: [root],
})

