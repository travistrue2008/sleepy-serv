export default [
  req => {
    req.result = 'module'
  },
  req => new Response(req.result),
]
