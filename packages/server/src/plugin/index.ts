import path from 'path'
import { plugin } from 'bun'
import { loadConfig } from './config'
import { scanRoutes } from './scanner'
import { generateBarrelModule } from './codegen'

const config = await loadConfig()

const apiRoot = path.resolve(
  process.cwd(),
  config.app?.root ?? './src/api',
)

const barrelPath = require.resolve('sleepy-serv')

const escaped = barrelPath
  .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

plugin({
  name: 'sleepy-serv',
  setup (build) {
    build.onLoad(
      { filter: new RegExp(escaped) },
      () => {
        const scanResult = scanRoutes(apiRoot)

        return {
          contents: generateBarrelModule(scanResult),
          loader: 'ts',
        }
      },
    )
  },
})
