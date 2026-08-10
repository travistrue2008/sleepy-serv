import type { Request } from 'sleepy-serv'

export default function (_req: Request): never {
  throw new Error('Boom')
}
