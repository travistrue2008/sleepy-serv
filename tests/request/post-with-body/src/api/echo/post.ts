import { parseJsonBody } from 'sleepy-serv'

import type { Request } from 'sleepy-serv'

type PreviousResult = Record<string, unknown>

export default [
  parseJsonBody(),
  (_req: Request, res: PreviousResult) =>
    Response.json({ received: res }, { status: 201 }),
]
