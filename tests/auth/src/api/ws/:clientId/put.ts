import { authorToken } from '../../../auth'

import type { AsyncHandlerResult, NextFn, Request } from 'sleepy-serv'
import type { Accum } from '../../../auth'

export default async function signJwt (
  _req: Request,
  res: Accum | null,
  next: NextFn,
): AsyncHandlerResult {
  return next({
    ...res,
    token: await authorToken(),
  })
}
