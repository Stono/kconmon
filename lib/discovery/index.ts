export interface IDiscovery {
  start()
  stop()
  agents(): Promise<IAgent[]>
  agent(name: string): Promise<IAgent | null>
}

export interface IAgent {
  name: string
  nodeName: string
  ip: string
  zone: string
}
