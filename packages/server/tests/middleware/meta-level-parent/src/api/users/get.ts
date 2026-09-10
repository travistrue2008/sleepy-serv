import type { Request } from 'sleepy-serv'

type Accum = {
  output: string
}

export default [
  (_req: Request, res: Accum) => new Response(res.output),
]
