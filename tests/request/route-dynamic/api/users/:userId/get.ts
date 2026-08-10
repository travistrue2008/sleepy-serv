import type { Request } from 'sleepy-serv'

export default function (req: Request): Response {
  return Response.json({
    id: req.params.userId,
    firstName: 'Tony',
    lastName: 'Stark',
    email: 'tony.stark@starkindustries.com',
  })
}
