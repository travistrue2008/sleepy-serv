export const middleware = [
  req => {
    req.result.push('parent-meta')
  },
]
