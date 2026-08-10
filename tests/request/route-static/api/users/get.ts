import type { Request } from 'sleepy-serv'

export default function (_req: Request): Response {
  return Response.json([
    {
      id: 1,
      firstName: 'Tony',
      lastName: 'Stark',
      email: 'tony.stark@starkindustries.com',
    },
  ])
}
