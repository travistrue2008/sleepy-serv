import { KickedCloseSignal } from '../../utils'

import type { AsyncHandlerResult, Request } from 'sleepy-serv'

export default async function handler (req: Request): AsyncHandlerResult {
  const body = await req.json() as { clientId: string }

  req.ws.drop(KickedCloseSignal, id => id === body.clientId)

  return new Response('', { status: 204 })
}
