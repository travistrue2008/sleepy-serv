import type { AsyncHandlerResult, Request } from 'sleepy-serv'

type Body = {
  userId: string,
}

type ConnectionData = {
  app: {
    userId: string
  }
}

export default async function handler (req: Request): AsyncHandlerResult {
  const body = await req.json() as Body

  const message = {
    message: `Hello from ${body.userId}`,
  }

  req.ws.send('player_joined', message, (_clientId, data) => {
    const connectionData = data as ConnectionData

    return connectionData.app.userId !== body.userId
  })

  return new Response('', { status: 204 })
}
