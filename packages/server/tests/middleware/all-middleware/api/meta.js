export const middleware = [
  (_req, res, next) => {
    res.list.push('parent-meta')

    return next()
  },
]
