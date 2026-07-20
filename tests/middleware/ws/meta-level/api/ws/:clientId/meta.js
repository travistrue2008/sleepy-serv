export const middleware = [
  (req, res, next) => {
    if (req.query.err === 'lvl_3') {
      throw new Error('Error Lvl 3')
    }

    return next([...res, 'c'])
  },
]
