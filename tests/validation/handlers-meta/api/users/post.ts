import type { Request } from 'sleepy-serv'

export default function (_req: Request, _res: unknown): Response {
  return new Response('', { status: 201 })
}
