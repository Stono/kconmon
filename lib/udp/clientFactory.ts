import { IAgent } from 'lib/discovery'
import UDPClient, { IUDPClient } from 'lib/udp/client'
import Logger from 'lib/logger'
import { IConfig } from 'lib/config'

export interface IUdpClientFactory {
  generateClientsForAgents(agents: IAgent[]): void
  clientFor(agent: IAgent): IUDPClient
}

export default class UDPClientFactory implements IUdpClientFactory {
  private clients: { [key: string]: IUDPClient } = {}
  private readonly logger = new Logger('udp-client-factory')
  private readonly config: IConfig
  constructor(config: IConfig) {
    this.config = config
  }

  public generateClientsForAgents(agents: IAgent[]) {
    agents.forEach((agent) => {
      if (!this.clients[agent.ip]) {
        this.logger.info(`new udp client created for ${agent.ip}`)
        this.clients[agent.ip] = new UDPClient(agent.ip, this.config.port)
      }
    })
    Object.keys(this.clients).forEach((ip) => {
      const agent = agents.find((a) => a.ip === ip)
      if (!agent) {
        this.logger.info(`udp client removed for ${ip}`)
        this.clients[ip].destroy()
        delete this.clients[ip]
      }
    })
  }

  public clientFor(agent: IAgent): IUDPClient {
    return this.clients[agent.ip]
  }
}
