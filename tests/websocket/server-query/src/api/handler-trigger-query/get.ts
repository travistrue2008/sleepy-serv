import type { AsyncHandlerResult, Request } from 'sleepy-serv'

type Query = {
  userId: string,
}

type ConnectionData = {
  userId: string
}

export default async function handler (
  req: Request<ConnectionData>,
): AsyncHandlerResult {
  const { userId } = req.query as Query

  const entries = req.ws.query((session) => {
    return session.data.userId !== userId
  })

  return Response.json({
    count: entries.length,
  })
}
