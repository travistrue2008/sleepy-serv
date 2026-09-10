import type { Middleware } from 'sleepy-serv'

export const middleware: Middleware[] = [
  (req, _res, next) => {
    req.ws.broadcast('state_changed', { score: 1 })

    return next()
  },
]
