import UDPServer, { IUDPServer } from 'lib/udp/server'
import * as td from 'testdouble'
import { IConfig } from 'lib/config'
import UDPClient, { IUDPClient } from 'lib/udp/client'
import * as should from 'should'

describe('UDP Server', () => {
  let server: IUDPServer
  let client: IUDPClient
  before(() => {
    const config = td.object<IConfig>()
    config.port = 8080
    server = new UDPServer(config)
    client = new UDPClient('127.0.0.1', config.port)
  })
  after(async () => {
    return server.stop()
  })
  it('should accept udp packets', async () => {
    await server.start()
    const result = await client.ping(50, 1)
    should(result.results.length).eql(1)
    should(result.results[0].success).eql(true)
    should(result.success).eql(true)
    should(Object.keys(result).sort()).eql(
      [
        'average',
        'duration',
        'loss',
        'max',
        'min',
        'results',
        'success',
        'variance'
      ].sort()
    )
  })
})
