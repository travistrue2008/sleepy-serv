export const middleware = [
  (req, res, next) => {
    if (req.query.err === 'lvl_1') {
      throw new Error('Error Lvl 1')
    }

    return next(['a'])
  },
]
