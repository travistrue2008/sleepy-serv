import type { Request } from 'sleepy-serv'

export default [
  (_req: Request) => new Response('Hello world'),
]
