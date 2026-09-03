import type { Request } from 'sleepy-serv'

export default function (req: Request): Response {
  const session = req.ws.active.values().next().value!

  return Response.json({
    app: session.ws.data.app,
  })
}
