export default async function (_req) {
  await Bun.sleep(70)

  return Response.json({ route: 'mid' })
}
