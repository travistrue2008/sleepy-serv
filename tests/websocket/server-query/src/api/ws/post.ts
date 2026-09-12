import { parseJsonBody } from 'sleepy-serv'

import type { NextFn, HandlerResult, Request } from 'sleepy-serv'

type PreviousResult = {
  data: Record<string, unknown>,
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
