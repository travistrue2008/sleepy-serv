import type { Middleware } from 'sleepy-serv'

type Query = {
  userId: string,
}

type ConnectionData = {
  userId: string
}

export const middleware: Middleware<ConnectionData>[] = [
  (req, _res, next) => {
    const { userId } = req.query as Query

    const entries = req.ws.query((session) => {
      return session.data.userId !== userId
    })

    return next({ count: entries.length })
  },
]
