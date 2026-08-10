import type { Request } from '../../../../../src'

type Accum = {
  output: string
}

export default function (_req: Request, res: Accum): Response {
  return new Response(res.output)
}
