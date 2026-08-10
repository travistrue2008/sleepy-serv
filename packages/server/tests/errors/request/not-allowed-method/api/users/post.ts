import type { Request } from '../../../../../../src'

/* istanbul ignore next */
export default function (_req: Request): Response {
  return new Response('Hello world')
}
