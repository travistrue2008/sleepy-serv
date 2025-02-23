export const middleware = [
  req => {
    req.result.push('sibling-meta')
  },
]
