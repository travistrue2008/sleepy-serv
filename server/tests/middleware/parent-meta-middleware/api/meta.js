export const middleware = [
  (_req, res, next) => {
    res.output = 'parent-meta'

    return next()
  },
]
