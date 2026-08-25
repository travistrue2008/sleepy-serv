import type { Request } from '../../../../src'

export default async function (req: Request): Promise<Response> {
  const first = await req.json()
  const second = await req.json()

  return Response.json({
    first,
    second,
  })
}
