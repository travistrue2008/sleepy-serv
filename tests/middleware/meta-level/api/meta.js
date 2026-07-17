export const middleware = [
  (_req, res, next) => next({
    ...res,
    stamp: 'via-meta',
  }),
]
