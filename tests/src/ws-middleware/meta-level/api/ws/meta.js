import { UnauthorizedError } from 'sleepy-serv'

/*
  A meta.js under a reserved directory contributes middleware to every handshake
  endpoint beneath it, including the POST and GET endpoints that have no method
  file of their own. Those are synthesized by buildMergedRoutes and still get
  this reserved-path meta chain ahead of the built-in terminal.
 */

function requireMeta (req, res, next) {
  if (!req.headers.get('x-meta')) {
    throw new UnauthorizedError()
  }

  return next(res)
}

export const middleware = [requireMeta]
