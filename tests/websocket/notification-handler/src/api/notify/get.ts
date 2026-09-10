import type { Request } from 'sleepy-serv'

export default function (req: Request): Response {
  const targetId = req.query.targetId as string

  req.ws.send(id => id === targetId, 'ping', {
    message: 'hello',
  })

  return Response.json({ ok: true })
}
