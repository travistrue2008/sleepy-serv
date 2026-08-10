import { ConflictError } from 'sleepy-serv'

import type { Request } from 'sleepy-serv'

export default function (_req: Request): never {
  throw new ConflictError('nope')
}
