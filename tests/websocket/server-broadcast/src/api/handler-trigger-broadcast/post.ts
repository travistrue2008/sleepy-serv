import type { Request } from 'sleepy-serv'

export default function handler (req: Request): Response {
  req.ws.broadcast('state_changed', { score: 1 })

  return new Response('', { status: 204 })
}
