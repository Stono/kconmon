import { Request, Response } from 'express'
import { IMetrics } from 'lib/apps/agent/metrics'
import { ITester } from 'lib/tester'
import { IDiscovery } from 'lib/discovery'

export interface IIndexController {
  readiness(req: Request, res: Response): void
  metrics(req: Request, res: Response): void
  udp(req: Request, res: Response): void
}

export default class IndexController implements IIndexController {
  private metricsManager: IMetrics
  private tester: ITester
  private discovery: IDiscovery
  constructor(
    metricsManager: IMetrics,
    tester: ITester,
    discovery: IDiscovery
  ) {
    this.metricsManager = metricsManager
    this.tester = tester
    this.discovery = discovery
  }
  public readiness(req: Request, res: Response): void {
    res.set('Connection', 'close')
    res.status(200)
    res.end()
    res.connection.destroy()
  }

  public metrics(req: Request, res: Response): void {
    res.setHeader('content-type', 'text/plain')
    res.send(this.metricsManager.toString())
  }

  public async udp(req: Request, res: Response): Promise<void> {
    let agents = await this.discovery.agents()
    if (req.params.agent) {
      agents = agents.filter((agent) => agent.name === req.params.agent)
    }
    const results = await this.tester.runUDPTests(agents)
    res.json(results)
  }
}
