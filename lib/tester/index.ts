import { Got } from 'got/dist/source'
import { IDiscovery, IAgent } from 'lib/discovery'
import { PlainResponse } from 'got/dist/source/core'
import { IMetrics } from 'lib/apps/agent/metrics'
import UDPClient, { IUDPClient, IUDPPingResult } from 'lib/udp/client'
import { IConfig } from 'lib/config'
import Logger, { ILogger } from 'lib/logger'
import * as dns from 'dns'

export interface ITester {
  start()
  stop()
  runUdpTests(agents: IAgent[]): Promise<IUDPTestResult[]>
  runDNSTests(): Promise<IDNSTestResult[]>
}

interface ITestResult {
  source: IAgent
  destination: IAgent
}

export interface IDNSTestResult {
  source: IAgent
  host: string
  result: 'pass' | 'fail'
}

export interface IUDPTestResult extends ITestResult {
  timings: IUDPPingResult
}

export interface ITCPTestSuccessResult extends ITestResult {
  timings: PlainResponse['timings']
}

export interface ITCPTestFailResult extends ITestResult {}

export default class Tester implements ITester {
  private got: Got
  private discovery: IDiscovery
  private logger: ILogger = new Logger('tester')
  private metrics: IMetrics
  private me: IAgent
  private running = false
  private config: IConfig
  private clients: { [key: string]: IUDPClient } = {}
  private resolver = new dns.promises.Resolver()

  constructor(
    config: IConfig,
    got: Got,
    discovery: IDiscovery,
    metrics: IMetrics,
    me: IAgent
  ) {
    this.got = got
    this.discovery = discovery
    this.metrics = metrics
    this.me = me
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
    const dnsEventLoop = async () => {
      while (this.running) {
        await this.runDNSTests()
        await delay(this.config.testConfig.dns.interval)
      }
    }
    agentUpdateLoop()
    tcpEventLoop()
    udpEventLoop()
    dnsEventLoop()
  }

  public async stop(): Promise<void> {
    this.running = false
  }

  public async runDNSTests(): Promise<IDNSTestResult[]> {
    const promises = this.config.testConfig.dns.hosts.map(
      async (host): Promise<IDNSTestResult> => {
        try {
          const result = await this.resolver.resolve4(host)
          const mapped: IDNSTestResult = {
            source: this.me,
            host,
            result: result && result.length > 0 ? 'pass' : 'fail'
          }
          this.metrics.handleDNSTestResult(mapped)
          return mapped
        } catch (ex) {
          this.logger.error(`dns test for ${host} failed`, ex)
          const mapped: IDNSTestResult = {
            source: this.me,
            host,
            result: 'fail'
          }
          this.metrics.handleDNSTestResult(mapped)
          return mapped
        }
      }
    )
    const result = await Promise.allSettled(promises)
    return result
      .filter((r) => r.status === 'fulfilled')
      .map((i) => (i as PromiseFulfilledResult<IDNSTestResult>).value)
  }

  public async runUdpTests(agents: IAgent[]): Promise<IUDPTestResult[]> {
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

    const results: IUDPTestResult[] = []
    const testAgent = async (agent: IAgent): Promise<void> => {
      const client = this.clients[agent.ip]
      const result = await client.ping(
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
