import type { Request } from 'sleepy-serv'

export default async function (_req: Request): Promise<Response> {
  /* replies well after the client has already timed out this request */
  await Bun.sleep(250)

  return Response.json({ late: true })
}
