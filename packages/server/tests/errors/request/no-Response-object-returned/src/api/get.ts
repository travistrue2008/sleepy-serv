import type { Request } from 'sleepy-serv'

export default function (_req: Request) {
  return {
    a: 1,
    b: 'asdf',
  }
}
