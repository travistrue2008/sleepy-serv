import path from 'path'
import http from 'http'
import fs from 'fs'
import querystring from 'querystring'

import { MethodNotAllowedError } from './errors'

function getAllFilePathsRec (targetPath, paths = []) {
  const entries = fs.readdirSync(targetPath)

  return entries.reduce((accum, curr) => {
    const currentPath = path.join(targetPath, '/', curr)
    const result = fs.statSync(currentPath).isDirectory()
      ? getAllFilePathsRec(currentPath, paths)
      : [path.join(process.cwd(), targetPath, '/', curr)]

    return [...accum, ...result]
  }, [])
}

function handleError (req, res, err) {
  console.error(err.stack, {
    method: req.method,
    url: req.url,
    body: req.body,
  })

  res.status(err.constructor.statusCode || 500).end()
}

async function buildHandler (route) {
  const module = await import(route.path)

  const chain = Array.isArray(module.default)
    ? module.default
    : [module.default]

    const handler = async (req, res) => {
    try {
      for (const fn of chain) {
        await fn(req, res)
      }
    } catch (err) {
      handleError(req, res, err)
    }
  }

  return {
    method: route.method,
    patternSegments: route.patternSegments,
    handler,
  }
}

function buildRoutes (targetPath) {
  const rootPath = path.join(process.cwd(), targetPath)
  const paths = getAllFilePathsRec(targetPath)

  const routes = paths.map(fullPath => {
    const trimmedPath = fullPath.replace(rootPath, '')
    const segments = trimmedPath.split('.')[0].split('/')
    const lastIndex = segments.length - 1

    return {
      method: segments[lastIndex],
      path: fullPath,
      patternSegments: segments.slice(1, lastIndex),
    }
  })

  return Promise.all(routes.map(buildHandler))
}

function buildBody (req) {
  return new Promise((resolve, reject) => {
    let body = ''

    req.on('error', err => reject(err))
    req.on('end', () => resolve(body ? JSON.parse(body) : null))

    req.on('data', chunk => {
      body += chunk.toString()
    })
  })
}

function buildParams (route, requestSegments) {
  return route.patternSegments.reduce((accum, curr, index) =>
    curr.startsWith(':') ? {
      ...accum,
      [curr.slice(1)]: requestSegments[index],
    } : accum
  , {})
}

function matchRoute (routes, requestSegments, method) {
  return routes.find(route => {
    if (requestSegments.length !== route.patternSegments.length) {
      return false
    }

    if (method.toUpperCase() !== route.method.toUpperCase()) {
      return false
    }

    return route.patternSegments.every((segment, index) =>
      segment.startsWith(':') ||
      segment === requestSegments[index]
    )
  })
}

async function processRequest (req, res, routes) {
  const [route, query] = req.url.split('?')
  const requestSegments = route.split('/').slice(1)
  const targetRoute = matchRoute(routes, requestSegments, req.method)

  if (!targetRoute) {
    throw new MethodNotAllowedError()
  }

  req.route = route
  req.query = query ? querystring.parse(query) : null
  req.params = buildParams(targetRoute, requestSegments)
  req.body = await buildBody(req)

  await targetRoute.handler(req, res)
}

function enhanceResponse (res) {
  res.status = statusCode => {
    res.statusCode = statusCode

    return res
  }
}

export async function createServer (port, path) {
  const routes = await buildRoutes(path)

  return http.createServer(async (req, res) => {
    enhanceResponse(res)
    await processRequest(req, res, routes)
  }).listen(port)
}
