export const middleware = [
  (_req, res, next) => next({
    ...res,
    list: [
      ...res.list,
      'parent-meta',
    ],
  }),
]
