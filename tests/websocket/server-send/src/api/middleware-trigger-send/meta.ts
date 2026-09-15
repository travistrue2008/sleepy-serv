import type { Middleware } from 'sleepy-serv'

type Body = {
  userId: string,
}

type ConnectionData = {
  userId: string
}

export const middleware: Middleware<ConnectionData>[] = [
  async (req, _res, next) => {
    const body = await req.json() as Body

    const message = {
      message: `Hello from ${body.userId}`,
    }

    req.ws.send('player_joined', message, (session) => {
      return session.data.userId !== body.userId
    })

    return next()
  },
]
