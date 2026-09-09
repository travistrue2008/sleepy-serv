import path from 'path'
import { setRoutes } from 'sleepy-serv'
import { loadConfig } from './config'
import { buildRouteConfig } from './builder'

const config = await loadConfig()

const apiRoot = config.app?.root
  ? path.resolve(process.cwd(), config.app.root)
  : path.join(process.cwd(), 'api')

const routeConfig = buildRouteConfig(apiRoot)

setRoutes(routeConfig)
