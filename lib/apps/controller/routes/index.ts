import IndexController from 'lib/apps/controller/controllers'
import { Application } from 'express'
import { IRoutes } from 'lib/web-server'

export default class IndexRoutes implements IRoutes {
  public applyRoutes(app: Application, controller: IndexController): void {
    app.get('/readiness', (req, res) => {
      controller.readiness.bind(controller)(req, res)
    })
    app.get('/agents', (req, res) => {
      controller.agents.bind(controller)(req, res)
    })
    app.get('/agent/:name', (req, res) => {
      controller.agent.bind(controller)(req, res)
    })
  }
}
