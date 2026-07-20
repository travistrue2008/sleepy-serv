import { parseJsonBody, validateSchemas } from 'sleepy-serv'

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
  parseJsonBody(),
  validateSchemas({
    body: SCHEMA_BODY,
  }),
  (_req, _res) => {
    return new Response('', { status: 201 })
  },
]
