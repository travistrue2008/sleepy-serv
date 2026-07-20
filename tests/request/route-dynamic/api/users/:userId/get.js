export default function (req) {
  return Response.json({
    id: req.params.userId,
    firstName: 'Tony',
    lastName: 'Stark',
    email: 'tony.stark@starkindustries.com',
  })
}
