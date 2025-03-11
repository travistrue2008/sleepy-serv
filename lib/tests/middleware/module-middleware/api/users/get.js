export default [
  (_req, res) => {
    res.output = 'module'
  },
  (_req, res) => new Response(res.output),
]
