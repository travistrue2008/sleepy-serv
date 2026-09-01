import { parseJsonBody } from 'sleepy-serv'

import type { NextFn, HandlerResult, Request } from 'sleepy-serv'

type PreviousResult = {
  data: {
    gameId: string,
    playerId: string,
  }
}

function handler (
  _req: Request,
  res: PreviousResult,
  next: NextFn,
): HandlerResult {
  return next(res.data)
}

export default [
  parseJsonBody(),
  handler,
]
