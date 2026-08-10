import type { Request } from 'sleepy-serv'

export default function (_req: Request): Response {
  return Response.json({ message: 'root' })
}
