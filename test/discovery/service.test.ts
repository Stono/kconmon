import { IDiscovery } from 'lib/discovery'
import ServiceDiscovery from 'lib/discovery/service'
import * as td from 'testdouble'
import { IConfig } from 'lib/config'
import { Got } from 'got/dist/source'
import TestHelpers from 'test/helpers'
import * as should from 'should'

describe('Discovery: Service', () => {
  let sut: IDiscovery
  let got: Got
  before(() => {
    const config = td.object<IConfig>()
    config.namespace = 'test'
    config.port = 8080
    got = td.function<Got>()
    sut = new ServiceDiscovery(config, got)
  })

  it('should get the current list of agents', async () => {
    const httpOptions = {
      timeout: 500,
      responseType: 'json',
      retry: { limit: 2 }
    }
    const response = {
      statusCode: 200,
      body: TestHelpers.loadSample('agents')
    }
    td.when(
      got(
        'http://controller.test.svc.cluster.local./agents',
        httpOptions as any
      )
    ).thenResolve(response)
    const agents = await sut.agents()
    should(agents).eql(response.body)
  })

  it('should get the details of a single agent', async () => {
    const httpOptions = {
      timeout: 500,
      responseType: 'json',
      retry: { limit: 2 }
    }
    const response = {
      statusCode: 200,
      body: TestHelpers.loadSample('agent')
    }
    td.when(
      got(
        'http://controller.test.svc.cluster.local./agent/kconmon-g88mt',
        httpOptions as any
      )
    ).thenResolve(response)
    const agents = await sut.agent('kconmon-g88mt')
    should(agents).eql(response.body)
  })
})
