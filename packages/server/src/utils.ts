import type { ErrorObject } from 'ajv'

export type ValidationError = Partial<ErrorObject>

export type FormattedError = {
  path: string
  message: string
}

export type MiddlewareNext = (data?: unknown) => Promise<Response>

export type Middleware<TReq = unknown> = (
  req: TReq,
  res: unknown,
  next: MiddlewareNext | null,
) => unknown

export function toSegments (pathString: string): string[] {
  const [pathname] = String(pathString).split('?')
  const segments = pathname.split('/')

  if (pathname.startsWith('/')) {
    segments.shift()
  }

  if (pathname.endsWith('/')) {
    segments.pop()
  }

  return segments
}

export function formatError (
  prefix: string,
  input: ValidationError,
): FormattedError {
  const fixedPath = input.instancePath || '/'
  const suffixPath = fixedPath.replace(/\//g, '.').replace('.', '')

  return {
    path: [prefix, suffixPath].filter(item => item).join('.'),
    message: input.message ?? '',
  }
}

export async function executeMiddlewareChain<TReq> (
  req: TReq,
  chain: Middleware<TReq>[],
): Promise<Response> {
  if (!chain.length) {
    throw new RangeError('Middleware chain is empty')
  }

  const executeMiddleware = async (
    index: number,
    res: unknown,
  ): Promise<Response> => {
    const currentMiddleware = chain[index]
    const isLastMiddleware = index === chain.length - 1

    const next = !isLastMiddleware ?
      (data?: unknown) => executeMiddleware(index + 1, data)
      : null

    const result = await currentMiddleware(req, res, next)

    if (result instanceof Response) {
      return result
    } else {
      throw new TypeError('Handler does not return a Response object')
    }
  }

  return executeMiddleware(0, null)
}
