export default [
  (_req, res, next) => {
    res.output = 'module'

    return next()
  },
  (_req, res) => new Response(res.output),
]
