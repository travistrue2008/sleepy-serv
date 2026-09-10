import type { Request } from 'sleepy-serv'

export default function (_req: Request): Response {
  return new Response('POST - successful')
}
