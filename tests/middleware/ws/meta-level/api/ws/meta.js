export const middleware = [
  (req, res, next) => {
    if (req.query.err === 'lvl_2') {
      throw new Error('Error Lvl 2')
    }

    return next([...res, 'b'])
  },
]
