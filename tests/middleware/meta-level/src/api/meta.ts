import type { Middleware } from 'sleepy-serv'

export const middleware: Middleware[] = [
  (_req, res, next) => next({
    ...res as Record<string, unknown>,
    stamp: 'via-meta',
  }),
]
