export default function (_req, res) {
  return Response.json({ sub: res.user.sub })
}
