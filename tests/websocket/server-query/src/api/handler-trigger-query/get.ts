import type { AsyncHandlerResult, Request } from 'sleepy-serv'

type Query = {
  userId: string,
}

type ConnectionData = {
  userId: string
}

export default async function handler (req: Request): AsyncHandlerResult {
  const { userId } = req.query as Query

  const entries = req.ws.query((session) => {
    const data = session.data as ConnectionData

    return data.userId !== userId
  })

  return Response.json({
    count: entries.length,
  })
}
