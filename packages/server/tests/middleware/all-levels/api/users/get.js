export default [
  (_req, res, next) => next({
    ...res,
    list: [
      ...res.list,
      'module',
    ],
  }),
  (_req, res) => new Response(res.list.join('|')),
]
