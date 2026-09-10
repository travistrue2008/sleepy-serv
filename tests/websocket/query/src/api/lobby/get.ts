import type { Request } from 'sleepy-serv'

export default function (req: Request): Response {
  const sessions = req.ws.query(() => true)

  return Response.json(sessions)
}
