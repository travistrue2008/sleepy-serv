import type { Request } from '../../../../../src'

type Accum = {
  output: string
}

export default [
  (_req: Request, res: Accum) => new Response(res.output),
]
