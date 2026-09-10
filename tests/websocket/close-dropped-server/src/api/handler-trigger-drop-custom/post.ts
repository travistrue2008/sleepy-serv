import type { AsyncHandlerResult, Request } from 'sleepy-serv'

export default async function handler (req: Request): AsyncHandlerResult {
  const body = await req.json() as { clientId: string }

  req.ws.drop(id => id === body.clientId, 3999, 'player_kicked')

  return new Response('', { status: 204 })
}
