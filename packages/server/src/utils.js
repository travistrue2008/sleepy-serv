export function formatError (prefix, input) {
  const fixedPath = input.instancePath || '/'
  const suffixPath = fixedPath.replace(/\//g, '.').replace('.', '')

  return {
    path: [prefix, suffixPath].filter(item => item).join('.'),
    message: input.message,
  }
}

export async function executeMiddlewareChain (req, res, middlewareChain) {
  if (!middlewareChain.length) {
    throw new RangeError('Middleware chain is empty')
  }

  const executeMiddleware = async (index) => {
    const currentMiddleware = middlewareChain[index]
    const isLastMiddleware = index === middlewareChain.length - 1

    const next = !isLastMiddleware ?
      () => executeMiddleware(index + 1)
      : null

    const result = await currentMiddleware(req, res, next)

    if (result instanceof Response) {
      return result
    } else {
      throw new TypeError('Handler does not return a Response object')
    }
  }

  return executeMiddleware(0)
}
