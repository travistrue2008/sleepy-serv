import type { Request } from '../../../../../src'

export default [
  (_req: Request) => new Response('Hello world'),
]
