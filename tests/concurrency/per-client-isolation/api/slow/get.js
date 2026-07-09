export default async function (_req) {
  await Bun.sleep(110)

  return Response.json({ route: 'slow' })
}
