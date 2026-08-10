import { parseJsonBody, validateSchemas } from 'sleepy-serv'

import type { FormatterSchema, Middleware } from 'sleepy-serv'

const SCHEMA_PARAMS: FormatterSchema = {
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
] satisfies Middleware[]
