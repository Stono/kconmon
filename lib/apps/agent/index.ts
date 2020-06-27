import * as path from 'path'
import * as tsConfigPaths from 'tsconfig-paths/lib'
import * as process from 'process'
import got from 'got'
import { Application } from 'express'
const baseUrl = path.join(__dirname, '../../..')

tsConfigPaths.register({
  baseUrl,
  paths: {}
})

import WebServer from 'lib/web-server'
import Tester from 'lib/tester'
import ServiceDiscovery from 'lib/discovery/service'
import IndexController from 'lib/apps/agent/controllers'
import IndexRoutes from 'lib/apps/agent/routes'
import Metrics from './metrics'
import * as os from 'os'
import UDPServer from 'lib/udp/server'
import UDPClient from 'lib/udp/client'
import config from 'lib/config'
import Logger from 'lib/logger'
const webServer = new WebServer(config)
const discovery = new ServiceDiscovery(config, got)
const metrics = new Metrics(config)
const logger = new Logger('agent')

const udpServer = new UDPServer(config)
const delay = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
const udpClient = new UDPClient()

;(async () => {
  await discovery.start()
  await udpServer.start()
  await delay(5000)

  const me = await discovery.agent(os.hostname())
  if (!me) {
    logger.error('failed to load agent metadata information!')
    process.exit(1)
  }
  logger.info(`loaded metadata`, me)
  const tester = new Tester(config, got, discovery, metrics, me, udpClient)
  const handlerInit = (app: Application): Promise<void> => {
    const indexController = new IndexController(metrics, tester, discovery)
    new IndexRoutes().applyRoutes(app, indexController)
    return Promise.resolve()
  }
  await webServer.start(handlerInit)
  await tester.start()

  async function shutdown() {
    const shutdownPeriod = 7500
    logger.info('stopping tester')
    await tester.stop()
    logger.info(`shutting down web and udp server in ${shutdownPeriod}ms`)
    setTimeout(async () => {
      await await udpServer.stop()
      await webServer.stop()
      setTimeout(() => {
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
})()
