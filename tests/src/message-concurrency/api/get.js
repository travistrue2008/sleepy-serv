export default async function (req) {
  await Bun.sleep(req.query.delay)

  return new Response()
}
