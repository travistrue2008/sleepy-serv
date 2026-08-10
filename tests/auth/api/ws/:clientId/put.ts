import { authorToken } from '../../../auth'

import type { NextFn, Request } from 'sleepy-serv'
import type { Accum } from '../../../auth'

export default async function signJwt (
  _req: Request,
  res: Accum | null,
  next: NextFn,
): Promise<Response> {
  return next({
    ...res,
    token: await authorToken(),
  })
}
