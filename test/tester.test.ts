import Tester, { ITester } from 'lib/tester'
import * as td from 'testdouble'
import { IConfig } from 'lib/config'
import { IDiscovery, IAgent } from 'lib/discovery'
import { IMetrics } from 'lib/apps/agent/metrics'
import * as should from 'should'
import UDPServer, { IUDPServer } from 'lib/udp/server'
import { Got } from 'got/dist/source'

describe('Tester', () => {
  let sut: ITester
  let config: IConfig
  let udpserver: IUDPServer
  let got: Got
  before(async () => {
    config = td.object<IConfig>()
    config.testConfig.udp.timeout = 500
    config.testConfig.udp.packets = 1
    config.testConfig.tcp.timeout = 500
    config.port = 8080
    udpserver = new UDPServer(config)
    await udpserver.start()
  })
  beforeEach(async () => {
    const discovery = td.object<IDiscovery>()
    const metrics = td.object<IMetrics>()
    const me = td.object<IAgent>()
    got = td.function<Got>()
    sut = new Tester(config, got, discovery, metrics, me)
  })
  after(async () => {
    await udpserver.stop()
  })

  it('should do a dns test', async () => {
    config.testConfig.dns.hosts = ['www.google.com']
    const result = await sut.runDNSTests()
    should(result[0].result).eql('pass')
  })

  it('should do a udp test', async () => {
    const agent = td.object<IAgent>()
    agent.ip = '127.0.0.1'
    agent.name = 'local'
    agent.nodeName = 'some-node'
    agent.zone = 'some-zone'
    const result = await sut.runUDPTests([agent])
    should(result[0].result).eql('pass')
  })

  it('should do a tcp test', async () => {
    td.when(
      got('http://127.0.0.1:8080/readiness', { timeout: 500 })
    ).thenResolve({ statusCode: 200 })

    const agent = td.object<IAgent>()
    agent.ip = '127.0.0.1'
    agent.name = 'local'
    agent.nodeName = 'some-node'
    agent.zone = 'some-zone'
    const result = await sut.runTCPTests([agent])
    should(result[0].result).eql('pass')
  })
})
