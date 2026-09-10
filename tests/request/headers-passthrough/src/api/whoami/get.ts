import type { Request } from 'sleepy-serv'

export default function (req: Request): Response {
  return Response.json({
    auth: req.headers.get('authorization'),
  })
}
