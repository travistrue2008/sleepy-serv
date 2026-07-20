export const middleware = [
  (_req, res, next) => next({
    ...res,
    output: 'parent-meta',
  }),
]
