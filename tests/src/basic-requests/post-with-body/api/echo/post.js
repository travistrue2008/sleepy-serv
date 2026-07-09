export default async function (req) {
  const body = await req.json()

  return Response.json({ received: body })
}
