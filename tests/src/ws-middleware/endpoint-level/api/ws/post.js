import { UnauthorizedError } from 'sleepy-serv'

/*
  A method file on a reserved handshake endpoint acts as middleware: it guards
  the mint step and returns next() on success so the built-in handler (appended
  as the terminal) actually mints the ticket. Returning a Response here instead
  of calling next() would bypass the handshake.
 */

export default function (req, res, next) {
  if (!req.headers.get('x-ws')) {
    throw new UnauthorizedError()
  }

  return next(res)
}
