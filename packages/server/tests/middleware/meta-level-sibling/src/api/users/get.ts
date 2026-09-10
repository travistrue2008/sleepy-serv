import type { Request } from 'sleepy-serv'

type Accum = {
  output: string
}

export default function (_req: Request, res: Accum): Response {
  return new Response(res.output)
}
