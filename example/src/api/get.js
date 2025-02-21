export default function (_req) {
  return new Response.json({
    id: 1,
    firstName: 'Tony',
    lastName: 'Stark',
    company: 'Stark Industries',
  }, { status: 200 })
}
