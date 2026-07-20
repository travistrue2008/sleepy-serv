export default function (_req) {
  return Response.json([
    {
      id: 1,
      firstName: 'Tony',
      lastName: 'Stark',
      email: 'tony.stark@starkindustries.com',
    },
  ])
}
