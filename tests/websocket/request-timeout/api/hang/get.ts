import type { Request } from 'sleepy-serv'

export default function (_req: Request): Promise<Response> {
  return new Promise(() => { })
}
