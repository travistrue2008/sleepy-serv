import type { Request } from '../../../../../../src'

export default function (req: Request): Response {
  return new Response(`Fetching user: ${req.params.userId}`)
}
