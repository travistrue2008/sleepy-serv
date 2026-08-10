import type { Request } from 'sleepy-serv'

export default async function (req: Request): Promise<Response> {
  await Bun.sleep(req.query.delay as number)

  return new Response()
}
