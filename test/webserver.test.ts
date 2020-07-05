import WebServer, { IWebServer } from 'lib/web-server'
import * as td from 'testdouble'
import * as express from 'express'
import { IConfig } from 'lib/config'
import got from 'got'
import * as should from 'should'

describe('Web Server', () => {
  let sut: IWebServer
  before(() => {
    const config = td.object<IConfig>()
    config.port = 8080
    sut = new WebServer(config)
  })
  after(async () => {
    return sut.stop()
  })
  it('should start and stop', async () => {
    await sut.start(
      (app: express.Application): Promise<void> => {
        app.get('/', (req, res) => {
          res.sendStatus(200)
        })
        return Promise.resolve()
      }
    )
    const result = await got('http://127.0.0.1:8080')
    should(result.statusCode).eql(200)
  })
})
