import { UnauthorizedError } from 'sleepy-serv'

/*
  A method file on the mint endpoint under a non-empty mountPath. It must merge
  with the built-in handshake terminal at `{mountPath}/ws` rather than orphan
  itself at the mounted path while the terminal stays at /ws.
 */

export default function (req, _res, next) {
  if (!req.headers.get('x-ws')) {
    throw new UnauthorizedError()
  }

  return next()
}
