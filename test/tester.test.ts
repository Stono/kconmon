import Tester, { ITester } from 'lib/tester'
import * as td from 'testdouble'
import { IConfig } from 'lib/config'
import got from 'got'
import { IDiscovery, IAgent } from 'lib/discovery'
import { IMetrics } from 'lib/apps/agent/metrics'
import * as should from 'should'

describe('Tester', () => {
  let sut: ITester
  let config: IConfig
  beforeEach(() => {
    config = td.object<IConfig>()
    const discovery = td.object<IDiscovery>()
    const metrics = td.object<IMetrics>()
    const me = td.object<IAgent>()
    sut = new Tester(config, got, discovery, metrics, me)
  })
  it('should do a dns test', async () => {
    config.testConfig.dns.hosts = ['www.google.com']
    const result = await sut.runDNSTests()
    should(result[0].result).eql('pass')
  })
})
