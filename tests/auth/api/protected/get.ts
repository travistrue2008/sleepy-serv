import type { Request } from 'sleepy-serv'
import type { Authenticated } from '../../auth'

export default function (_req: Request, res: Authenticated): Response {
  return Response.json({ sub: res.user.sub })
}
