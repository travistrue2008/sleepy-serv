import type { Request } from 'sleepy-serv'

export default function (req: Request): Response {
  const targetId = req.query.targetId as string

  req.ws.send('ping', { message: 'hello' }, session =>
    session.clientId === targetId,
  )

  return Response.json({ ok: true })
}
