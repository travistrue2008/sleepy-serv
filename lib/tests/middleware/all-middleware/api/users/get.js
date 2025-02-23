export default [
  req => {
    req.result.push('module')
  },
  req => new Response(req.result.join('|')),
]
