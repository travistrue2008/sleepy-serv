import type { HandlerResult, Request } from 'sleepy-serv'

export default function (_req: Request): HandlerResult {
  return new Promise(() => { })
}
