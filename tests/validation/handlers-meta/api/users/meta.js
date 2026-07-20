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

export const middleware = [
  parseJsonBody(),
  validateSchemas({
    body: SCHEMA_BODY,
  }),
]
