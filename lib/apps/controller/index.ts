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
const kubernetes = new Kubernetes()
const webServer = new WebServer(config)
const discovery = new KubernetesDiscovery(config, kubernetes)

const handlerInit = (app: Application): Promise<void> => {
  const indexController = new IndexController(discovery)
  new IndexRoutes().applyRoutes(app, indexController)
  return Promise.resolve()
}

;(async () => {
  await discovery.start()
  await webServer.start(handlerInit)
})()

async function shutdown() {
  await webServer.stop()
  setTimeout(() => {
    process.exit(0)
  }, 1000)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection!')
  console.error(error)
  process.exit(1)
})
