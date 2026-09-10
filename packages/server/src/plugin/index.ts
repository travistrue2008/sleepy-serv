import path from 'path'
import { plugin } from 'bun'
import { loadConfig } from './config'
import { scanRoutes } from './scanner'
import { generateBarrelModule } from './codegen'

const config = await loadConfig()
const relativeRoot = config.app?.root ?? './src/api'
const apiRoot = path.resolve(process.cwd(), relativeRoot)
const barrelPath = require.resolve('sleepy-serv')
const escaped = barrelPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const constraints = {
  filter: new RegExp(escaped),
}

plugin({
  name: 'sleepy-serv',
  setup (build) {
    build.onLoad(constraints, () => {
      const scanResult = scanRoutes(apiRoot)
      const contents = generateBarrelModule(scanResult)

      return { loader: 'ts', contents }
    })
  },
})
