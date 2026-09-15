import type { Request, Middleware } from 'sleepy-serv'

type Body = {
  userId: string,
}

type ConnectionData = {
  userId: string
}

export const middleware: Middleware[] = [
  async (req: Request, _res, next) => {
    const body = await req.json() as Body

    const message = {
      message: `Hello from ${body.userId}`,
    }

    req.ws.send('player_joined', message, (session) => {
      const data = session.data as ConnectionData

      return data.userId !== body.userId
    })

    return next()
  },
]
