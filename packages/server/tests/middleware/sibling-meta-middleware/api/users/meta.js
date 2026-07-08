export const middleware = [
  (_req, res, next) => {
    res.output = 'sibling-meta'

    return next()
  },
]
