export default function (req) {
  return Response.json({
    auth: req.headers.get('authorization'),
  })
}
