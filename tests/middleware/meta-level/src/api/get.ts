import type { Request } from 'sleepy-serv'

export default function (_req: Request, res: unknown): Response {
  return Response.json(res)
}
