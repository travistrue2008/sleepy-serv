import { validateSchemas } from 'sleepy-serv'

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
  function (_req, _res) {
    return new Response('', { status: 201 })
  },
]