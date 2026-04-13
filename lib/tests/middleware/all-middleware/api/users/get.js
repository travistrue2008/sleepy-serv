export default [
  (_req, res, next) => {
    res.list.push('module')

    return next()
  },
  (_req, res) => new Response(res.list.join('|')),
]
