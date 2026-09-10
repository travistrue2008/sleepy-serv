import { createApp } from 'sleepy-serv'

import type { NextFn, Request } from 'sleepy-serv'

type Accum = {
  list: string[]
}

createApp(0, {
  middleware: [
    (_req: Request, res: unknown, next: NextFn) => next({
      ...res as Accum,
      list: ['root'],
    }),
  ],
})
