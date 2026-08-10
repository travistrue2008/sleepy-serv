import type { Request } from '../../../../../src'

export default function (_req: Request): never {
  throw new Error('Bad')
}
