import http from 'http'

import { MethodNotAllowedError } from './errors'

function errorHandler (req, res, err) {
  const statusCode = err.statusCode || 500

  const context = {
    method: req.method,
    url: req.url,
  }

  console.error(err.stack, context)
  res.status(statusCode).end()
}

async function buildRoutes (targetPath) {
  const rootPath = path.join(process.cwd(), targetPath)
  const paths = getAllFilePathsRec(targetPath)
  const router = express.Router()

  const routes = paths.map(fullPath => {
    const trimmedPath = fullPath.replace(rootPath, '')
    const segments = trimmedPath.split('.')[0].split('/')
    const lastIndex = segments.length - 1

    return {
      verb: segments[lastIndex],
      path: fullPath,
      pattern: segments.slice(0, lastIndex).join('/'),
    }
  })

  const promises = routes.map(async route => {
    const module = await import(route.path)

    const handler = async (req, res) => {
      try {
        const chain = Array.isArray(module.default)
          ? module.default
          : [module.default]

        for (const fn of chain) {
          await Promise.resolve(fn(req, res))
        }
      } catch (err) {
        handleError(err, req, res)
      }
    }

    return {
      verb: route.verb,
      route: route.pattern,
      handler,
    }
  })

  return Promise.all(promises)
}

function buildRouter (path) {
  const router = buildRoutes(path)

  return (req, res) => {
  }
}

export function createServer (port, path) {
  const router = buildRouter(path)

  return http.createServer(async (req, res) => {
    try {
      console.log(req)

      await router(req, res)

      if (!req.writableEnded) {
        throw new MethodNotAllowedError()
      }
    } catch (err) {
      errorHandler(req, res, err)
    }
  }).listen(port)
}
