import Tester, { ITester } from 'lib/tester'
import * as td from 'testdouble'
import { IConfig } from 'lib/config'
import { IDiscovery, IAgent } from 'lib/discovery'
import { IMetrics } from 'lib/apps/agent/metrics'
import * as should from 'should'
import { Got } from 'got/dist/source'
import { IUdpClientFactory } from 'lib/udp/clientFactory'
import { IUDPClient, IUDPPingResult } from 'lib/udp/client'

describe('Tester', () => {
  let sut: ITester
  let config: IConfig
  let got: Got
  let udpClientFactory: IUdpClientFactory

  before(async () => {
    config = td.object<IConfig>()
    config.testConfig.udp.timeout = 500
    config.testConfig.udp.packets = 1
    config.testConfig.tcp.timeout = 500
    config.testConfig.custom_tcp.timeout = 500
    config.testConfig.icmp.count = 2
    config.testConfig.icmp.timeout = 5
    config.port = 8080
  })

  beforeEach(async () => {
    const discovery = td.object<IDiscovery>()
    const metrics = td.object<IMetrics>()
    const me = td.object<IAgent>()
    got = td.function<Got>()
    udpClientFactory = td.object<IUdpClientFactory>()
    sut = new Tester(config, got, discovery, metrics, me, udpClientFactory)
  })

  it('should do a icmp test', async () => {
    config.testConfig.icmp.hosts = ['www.google.com']
    const result = await sut.runICMPTests()
    should(result[0].result).eql('pass')
  })

  it('should do a custom tcp test', async () => {
    config.testConfig.custom_tcp.hosts = ['www.google.com']
    const result = await sut.runICMPTests()
    should(result[0].result).eql('pass')
  })

  it('should do a dns test', async () => {
    config.testConfig.dns.hosts = ['www.google.com']
    const result = await sut.runDNSTests()
    should(result[0].result).eql('pass')
  })

  it('should do a udp test', async () => {
    const udpClient = td.object<IUDPClient>()
    const udpPingResult = td.object<IUDPPingResult>()
    udpPingResult.success = true
    td.when(
      udpClient.ping(
        config.testConfig.udp.timeout,
        config.testConfig.udp.packets
      )
    ).thenResolve(udpPingResult)
    const agent = td.object<IAgent>()
    agent.ip = '127.0.0.1'
    agent.name = 'local'
    agent.nodeName = 'some-node'
    agent.zone = 'some-zone'
    td.when(udpClientFactory.clientFor(agent)).thenReturn(udpClient)

    const result = await sut.runUDPTests([agent])
    should(result[0].result).eql('pass')
  })

  it('should should capture a failed ping as an fail', async () => {
    const udpClient = td.object<IUDPClient>()
    const udpPingResult = td.object<IUDPPingResult>()
    udpPingResult.success = true
    td.when(
      udpClient.ping(
        config.testConfig.udp.timeout,
        config.testConfig.udp.packets
      )
    ).thenReject(new Error('boom'))
    const agent = td.object<IAgent>()
    agent.ip = '127.0.0.1'
    agent.name = 'local'
    agent.nodeName = 'some-node'
    agent.zone = 'some-zone'
    td.when(udpClientFactory.clientFor(agent)).thenReturn(udpClient)

    const result = await sut.runUDPTests([agent])
    should(result[0].result).eql('fail')
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

  it('should capture a 5xx code as a fail', async () => {
    td.when(
      got('http://127.0.0.1:8080/readiness', { timeout: 500 })
    ).thenResolve({ statusCode: 500 })

    const agent = td.object<IAgent>()
    agent.ip = '127.0.0.1'
    agent.name = 'local'
    agent.nodeName = 'some-node'
    agent.zone = 'some-zone'
    const result = await sut.runTCPTests([agent])
    should(result[0].result).eql('fail')
  })

  it('should capture a failed tcp test as a fail', async () => {
    td.when(
      got('http://127.0.0.1:8080/readiness', { timeout: 500 })
    ).thenReject(new Error('boom'))

    const agent = td.object<IAgent>()
    agent.ip = '127.0.0.1'
    agent.name = 'local'
    agent.nodeName = 'some-node'
    agent.zone = 'some-zone'
    const result = await sut.runTCPTests([agent])
    should(result[0].result).eql('fail')
  })
})
