export default function (req) {
  return new Response(`Fetching user: ${req.params.userId}`)
}
