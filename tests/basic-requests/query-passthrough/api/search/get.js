export default function (req) {
  return Response.json({ query: req.query })
}
