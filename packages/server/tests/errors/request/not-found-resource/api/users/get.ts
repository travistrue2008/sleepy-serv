import type { Request } from '../../../../../../src'

export default function (_req: Request): Response {
  return new Response('Hello world')
}
