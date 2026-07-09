export default async function (_req) {
  await Bun.sleep(30)

  return Response.json({ route: 'fast' })
}
