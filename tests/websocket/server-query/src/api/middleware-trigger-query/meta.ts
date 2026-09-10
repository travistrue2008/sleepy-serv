import type { Middleware } from 'sleepy-serv'

type Query = {
  userId: string,
}

type ConnectionData = {
  app: {
    userId: string
  }
}

export const middleware: Middleware[] = [
  (req, _res, next) => {
    const { userId } = req.query as Query

    const entries = req.ws.query((_clientId, data) => {
      const connectionData = data as ConnectionData

      return connectionData.app.userId !== userId
    })

    return next({ count: entries.length })
  },
]
