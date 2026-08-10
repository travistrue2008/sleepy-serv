import type { Request } from 'sleepy-serv'

export default async function (req: Request): Promise<Response> {
  const body = await req.json()

  return Response.json({ received: body }, { status: 201 })
}
