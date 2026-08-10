import { authorToken } from '../../auth'

import type { Request } from 'sleepy-serv'

export default async function signJwt (
  _req: Request,
  _res: unknown,
): Promise<Response> {
  const token = await authorToken()

  return new Response(token)
}
