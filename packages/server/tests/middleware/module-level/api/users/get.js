function middleware (_req, res, next) {
  return next({
    ...res,
    output: 'module',
  })
}

export default [
  middleware,
  (_req, res) => new Response(res.output),
]
