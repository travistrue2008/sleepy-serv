import { ConflictError } from 'sleepy-serv'

export default function (_req) {
  throw new ConflictError('nope')
}
