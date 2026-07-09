export default function (req) {
  return Response.json({ n: req.query.n })
}
