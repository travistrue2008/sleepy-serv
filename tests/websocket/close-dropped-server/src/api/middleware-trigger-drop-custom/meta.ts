import type { Middleware } from 'sleepy-serv'

export const middleware: Middleware[] = [
  async function (req, _res, next) {
    const body = await req.json() as { clientId: string }

    req.ws.drop(id => id === body.clientId, 3999, 'player_kicked')

    return next()
  },
]
