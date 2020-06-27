import { Request, Response } from 'express'
import { IDiscovery } from 'lib/discovery'

export interface IIndexController {
  readiness(req: Request, res: Response): void
}

export default class IndexController implements IIndexController {
  private discovery: IDiscovery
  constructor(discovery: IDiscovery) {
    this.discovery = discovery
  }

  public readiness(req: Request, res: Response): void {
    res.status(200).end()
  }

  public async agents(req: Request, res: Response): Promise<void> {
    const agents = await this.discovery.agents()
    res.json(agents)
  }

  public async agent(req: Request, res: Response): Promise<void> {
    const name = req.params.name
    if (!name) {
      res.sendStatus(400)
      return
    }
    const agent = await this.discovery.agent(name)
    if (!agent) {
      res.sendStatus(500)
      return
    }
    res.json(agent)
  }
}
