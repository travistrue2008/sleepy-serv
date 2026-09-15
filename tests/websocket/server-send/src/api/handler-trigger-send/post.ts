import type { AsyncHandlerResult, Request } from 'sleepy-serv'

type Body = {
  userId: string,
}

type ConnectionData = {
  userId: string
}

export default async function handler (
  req: Request<ConnectionData>,
): AsyncHandlerResult {
  const body = await req.json() as Body

  const message = {
    message: `Hello from ${body.userId}`,
  }

  req.ws.send('player_joined', message, (session) => {
    return session.data.userId !== body.userId
  })

  return new Response('', { status: 204 })
}
