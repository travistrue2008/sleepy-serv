import type { Middleware } from 'sleepy-serv'

type Query = {
  userId: string,
}

type ConnectionData = {
  userId: string
}

export const middleware: Middleware[] = [
  (req, _res, next) => {
    const { userId } = req.query as Query

    const entries = req.ws.query((session) => {
      const data = session.data as ConnectionData

      return data.userId !== userId
    })

    return next({ count: entries.length })
  },
]
