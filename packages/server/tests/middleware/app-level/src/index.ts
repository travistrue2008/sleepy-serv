import { createApp } from 'sleepy-serv'

import type { NextFn, Request } from 'sleepy-serv'

type Accum = {
  output: string
}

createApp(0, {
  ws: true,
  middleware: [
    (_req: Request, res: unknown, next: NextFn) => next({
      ...res as Accum,
      output: 'root',
    }),
  ],
})
