export default function (req) {
  return Response.json({
    userId: req.params.userId,
  })
}
