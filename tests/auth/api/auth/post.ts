import { authorToken } from '../../auth'

import type { AsyncHandlerResult, Request } from 'sleepy-serv'

export default async function signJwt (
  _req: Request,
  _res: unknown,
): AsyncHandlerResult {
  const token = await authorToken()

  return new Response(token)
}
