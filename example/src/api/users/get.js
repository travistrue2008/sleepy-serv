export default function (req) {
  return Response.json([
    {
      id: 1,
      firstName: 'Tony',
      lastName: 'Stark',
      company: 'Stark Industries',
    }
  ])
}
