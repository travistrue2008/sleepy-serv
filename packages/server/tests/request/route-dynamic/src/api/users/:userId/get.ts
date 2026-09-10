import type { Request } from 'sleepy-serv'

export default function (req: Request): Response {
  return new Response(`Fetching user: ${req.params.userId}`)
}
