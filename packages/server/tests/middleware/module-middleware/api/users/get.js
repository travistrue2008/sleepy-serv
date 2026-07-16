export default [
  (_req, res, next) => next({
    ...res,
    output: 'module',
  }),
  (_req, res) => new Response(res.output),
]
