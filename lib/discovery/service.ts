import { IDiscovery, IAgent } from 'lib/discovery'
import { Got } from 'got/dist/source'
import { IConfig } from 'lib/config'
import Logger from 'lib/logger'

export default class ServiceDiscovery implements IDiscovery {
  private got: Got
  private logger = new Logger('discovery')
  private lastResult: IAgent[] = []
  private config: IConfig
  constructor(config: IConfig, got: Got) {
    this.got = got
    this.config = config
  }

  public async start(): Promise<void> {}
  public async stop(): Promise<void> {}
  public async agents(): Promise<IAgent[]> {
    try {
      const result = await this.got<IAgent[]>(
        `http://controller.${this.config.namespace}.svc.cluster.local/agents`,
        {
          responseType: 'json',
          timeout: 500,
          retry: {
            limit: 2
          }
        }
      )
      this.lastResult = result.body
    } catch (ex) {
      this.logger.error(
        'failed to retrieve current agent list from controller',
        ex
      )
    }
    return this.lastResult
  }

  public async agent(name: string): Promise<IAgent | null> {
    try {
      const result = await this.got<IAgent>(
        `http://controller.${this.config.namespace}.svc.cluster.local/agent/${name}`,
        {
          responseType: 'json',
          timeout: 500,
          retry: {
            limit: 2
          }
        }
      )
      return result.body
    } catch (ex) {
      this.logger.error(
        'failed to retrieve real time agent information from controller',
        ex
      )
      return null
    }
  }
}
