/* This is only here for the /api directory to exist without a .gitkeep */

import type { NextFn, Request } from 'sleepy-serv'

export default function (
  _req: Request,
  _res: unknown,
  next: NextFn | null,
): Response | Promise<Response> {
  return next!()
}
