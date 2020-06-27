import { Got } from 'got/dist/source'
import { IDiscovery, IAgent } from 'lib/discovery'
import { PlainResponse } from 'got/dist/source/core'
import { IMetrics } from 'lib/apps/agent/metrics'
import { IUDPClient, IUDPPingResult } from 'lib/udp/client'
import { IConfig } from 'lib/config'
import Logger, { ILogger } from 'lib/logger'

export interface ITester {
  start()
  stop()
  runUdpTests(agents: IAgent[]): Promise<IUDPTestResult[]>
}

export interface IUDPTestResult {
  source: IAgent
  destination: IAgent
  timings: IUDPPingResult
}

export interface ITCPTestSuccessResult {
  source: IAgent
  destination: IAgent
  timings: PlainResponse['timings']
}

export interface ITCPTestFailResult {
  source: IAgent
  destination: IAgent
}

export default class Tester implements ITester {
  private got: Got
  private discovery: IDiscovery
  private logger: ILogger = new Logger('tester')
  private metrics: IMetrics
  private me: IAgent
  private udpClient: IUDPClient
  private running = false
  private config: IConfig

  constructor(
    config: IConfig,
    got: Got,
    discovery: IDiscovery,
    metrics: IMetrics,
    me: IAgent,
    udpClient: IUDPClient
  ) {
    this.got = got
    this.discovery = discovery
    this.metrics = metrics
    this.me = me
    this.udpClient = udpClient
    this.config = config
  }

  public async start(): Promise<void> {
    const delay = (ms: number) => {
      return new Promise((resolve) => setTimeout(resolve, ms))
    }

    this.running = true
    let agents = await this.discovery.agents()
    const agentUpdateLoop = async () => {
      while (this.running) {
        agents = await this.discovery.agents()
        await delay(5000)
      }
    }
    const tcpEventLoop = async () => {
      while (this.running) {
        this.metrics.resetTCPMetrics()
        await this.runTcpTests(agents)
        await delay(this.config.testConfig.tcp.interval)
      }
    }
    const udpEventLoop = async () => {
      while (this.running) {
        this.metrics.resetUDPMetrics()
        await this.runUdpTests(agents)
        await delay(this.config.testConfig.udp.interval)
      }
    }
    agentUpdateLoop()
    tcpEventLoop()
    udpEventLoop()
  }

  public async stop(): Promise<void> {
    this.running = false
  }

  public async runUdpTests(agents: IAgent[]): Promise<IUDPTestResult[]> {
    const results: IUDPTestResult[] = []
    const testAgent = async (agent: IAgent): Promise<void> => {
      const result = await this.udpClient.ping(
        agent.ip,
        this.config.port,
        this.config.testConfig.udp.timeout,
        this.config.testConfig.udp.packets
      )
      if (result.loss > 0) {
        this.logger.warn('packet loss detected', result)
      }
      const testResult = {
        source: this.me,
        destination: agent,
        timings: result
      }
      results.push(testResult)
      this.metrics.handleUDPTestResult(testResult)
    }
    const promises = agents.map(testAgent)
    await Promise.allSettled(promises)

    return results
  }

  private async runTcpTests(agents: IAgent[]): Promise<void> {
    const testAgent = async (agent: IAgent): Promise<void> => {
      try {
        const url = `http://${agent.ip}:${this.config.port}/readiness`
        const result = await this.got(url, {
          timeout: this.config.testConfig.tcp.timeout
        })
        const mappedResult = {
          source: this.me,
          destination: agent,
          timings: result.timings
        }
        this.metrics.handleTCPTestSuccess(mappedResult)
      } catch (ex) {
        this.logger.warn(
          `test failed`,
          {
            source: this.me,
            destination: agent
          },
          ex
        )
        const failResult = {
          source: this.me,
          destination: agent
        }
        this.metrics.handleTCPTestFailure(failResult)
      }
    }
    const promises = agents.map(testAgent)
    await Promise.allSettled(promises)
  }
}
