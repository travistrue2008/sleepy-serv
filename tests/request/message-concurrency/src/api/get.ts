import type { AsyncHandlerResult, Request } from 'sleepy-serv'

export default async function (req: Request): AsyncHandlerResult {
  await Bun.sleep(req.query.delay as number)

  return new Response()
}
