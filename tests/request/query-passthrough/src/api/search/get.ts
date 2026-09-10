import type { Request } from 'sleepy-serv'

export default function (req: Request): Response {
  return Response.json({ query: req.query })
}
