export const middleware = [
  (_req, res, next) => {
    res.stamp = 'via-meta'

    return next()
  },
]
