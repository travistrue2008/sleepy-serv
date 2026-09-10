import type { AsyncHandlerResult, Request } from 'sleepy-serv'

type Query = {
  userId: string,
}

type ConnectionData = {
  app: {
    userId: string
  }
}

export default async function handler (req: Request): AsyncHandlerResult {
  const { userId } = req.query as Query

  const entries = req.ws.query((_clientId, data) => {
    const connectionData = data as ConnectionData

    return connectionData.app.userId !== userId
  })

  return Response.json({
    count: entries.length,
  })
}
