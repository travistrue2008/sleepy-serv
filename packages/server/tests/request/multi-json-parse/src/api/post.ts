import type { AsyncHandlerResult, Request } from '../../../../../src/core/utils'

export default async function (req: Request): AsyncHandlerResult {
  const first = await req.json()
  const second = await req.json()

  return Response.json({
    first,
    second,
  })
}
