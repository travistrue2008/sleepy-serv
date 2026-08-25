import type { Request } from '../../../../src'

export default function (req: Request): Response {
  const count = req.ws.active.size

  return Response.json({ count })
}
