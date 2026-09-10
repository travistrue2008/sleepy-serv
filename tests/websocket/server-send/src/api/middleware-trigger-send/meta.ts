import type { Request, Middleware } from 'sleepy-serv'

type Body = {
  userId: string,
}

type ConnectionData = {
  app: {
    userId: string
  }
}

export const middleware: Middleware[] = [
  async (req: Request, _res, next) => {
    const body = await req.json() as Body

    const message = {
      message: `Hello from ${body.userId}`,
    }

    req.ws.send(
      (_clientId, data) => {
        const connectionData = data as ConnectionData

        return connectionData.app.userId !== body.userId
      },
      'player_joined',
      message,
    )

    return next()
  },
]
