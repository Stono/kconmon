import * as path from 'path'
import * as tsConfigPaths from 'tsconfig-paths/lib'
import * as process from 'process'
import { Application } from 'express'
const baseUrl = path.join(__dirname, '../../..')

tsConfigPaths.register({
  baseUrl,
  paths: {}
})

import WebServer from 'lib/web-server'
import KubernetesDiscovery from 'lib/discovery/kubernetes'
import IndexController from 'lib/apps/controller/controllers'
import IndexRoutes from 'lib/apps/controller/routes'
import config from 'lib/config'
import Kubernetes from 'lib/kubernetes/client'
import Logger from 'lib/logger'
const kubernetes = new Kubernetes()
const webServer = new WebServer(config)
const discovery = new KubernetesDiscovery(config, kubernetes)

const handlerInit = (app: Application): Promise<void> => {
  const indexController = new IndexController(discovery)
  new IndexRoutes().applyRoutes(app, indexController)
  return Promise.resolve()
}
const logger = new Logger('controller')
;(async () => {
  await discovery.start()
  await webServer.start(handlerInit)
  logger.log('controller started successfully')
})()

async function shutdown() {
  const shutdownPeriod = 7500
  logger.info(`stopping controller, will exit in ${shutdownPeriod}ms`)
  setTimeout(async () => {
    await webServer.stop()
    await discovery.stop()
    setTimeout(() => {
      logger.info('controller stopped')
      process.exit(0)
    }, 1000)
  }, shutdownPeriod)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection!')
  console.error(error)
  process.exit(1)
})
