import { UnauthorizedError } from 'sleepy-serv'

/*
  A method file on the upgrade endpoint acts as middleware: it guards the
  upgrade and returns next() on success so the built-in GET handler (appended as
  the terminal) redeems the ticket and upgrades. Returning a Response here
  instead of calling next() would bypass the upgrade.
 */

export default function (req, res, next) {
  if (!req.headers.get('x-ws')) {
    throw new UnauthorizedError()
  }

  return next(res)
}
