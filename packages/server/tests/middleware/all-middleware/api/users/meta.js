export const middleware = [
  (_req, res, next) => {
    res.list.push('sibling-meta')

    return next()
  },
]
