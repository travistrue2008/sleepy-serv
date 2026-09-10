import type { Request } from 'sleepy-serv'

/* istanbul ignore next */
export default function (_req: Request): Response {
  return new Response('Hello world')
}
