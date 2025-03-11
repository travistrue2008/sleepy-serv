export default [
  (_req, res) => {
    res.list.push('module')
  },
  (_req, res) => new Response(res.list.join('|')),
]
