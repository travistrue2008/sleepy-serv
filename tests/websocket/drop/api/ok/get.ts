import type { Request } from 'sleepy-serv'

export default function (req: Request): Response {
  return Response.json({
    count: req.ws.active.size,
  })
}
