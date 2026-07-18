import { parseJsonBody, validateSchemas } from 'sleepy-serv'

const SCHEMA_PARAMS = {
  clientId: {
    type: 'format',
    value: 'uuid',
  },
}

export const middleware = [
  parseJsonBody(),
  validateSchemas({
    params: SCHEMA_PARAMS,
  }),
]
