import { validateSchemas } from 'sleepy-serv'

import type { MiddlewareChain, Request } from 'sleepy-serv'

const SCHEMA_BODY = {
  type: 'object',
  properties: {
    email: {
      type: 'string',
      format: 'email',
    },
  },
  required: [
    'email',
  ],
}

export default [
  validateSchemas({
    body: SCHEMA_BODY,
  }),
  function (_req: Request, _res: unknown) {
    return new Response('', { status: 201 })
  },
] satisfies MiddlewareChain
