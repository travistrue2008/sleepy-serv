export default async function (_req) {
  /* replies well after the client has already timed out this request */
  await Bun.sleep(250)

  return Response.json({ late: true })
}
