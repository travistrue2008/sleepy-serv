import type { AsyncHandlerResult, Request } from 'sleepy-serv'

export default async function (req: Request): AsyncHandlerResult {
  const body = await req.json()

  return Response.json({ received: body }, { status: 201 })
}
