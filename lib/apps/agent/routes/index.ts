import IndexController from 'lib/apps/agent/controllers'
import { Application } from 'express'
import { IRoutes } from 'lib/web-server'

export default class IndexRoutes implements IRoutes {
  public applyRoutes(app: Application, controller: IndexController): void {
    app.get('/readiness', (req, res) => {
      controller.readiness.bind(controller)(req, res)
    })
    app.get('/metrics', (req, res) => {
      controller.metrics.bind(controller)(req, res)
    })
    app.get('/test/udp/:agent', (req, res) => {
      controller.udp.bind(controller)(req, res)
    })
    app.get('/test/udp', (req, res) => {
      controller.udp.bind(controller)(req, res)
    })
  }
}
