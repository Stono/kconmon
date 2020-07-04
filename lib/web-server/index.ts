import * as express from 'express'
import * as stoppable from 'stoppable'
import { IConfig } from 'lib/config'
import Logger, { ILogger } from 'lib/logger'

export type ApplyRoutesHandler = (app: express.Application) => Promise<void>
export interface IWebServer {
  start(handlerInit: ApplyRoutesHandler): void
  stop(): void
}
export interface IRoutes {
  /** Apply the routes to the express server */
  applyRoutes(app: express.Application, controller): void
}

export default class WebServer implements IWebServer {
  private http
  private logger: ILogger
  private config: IConfig

  constructor(config: IConfig) {
    this.config = config
    this.logger = new Logger('web-server')
  }

  /* eslint max-statements: off */
  public async start(handlerInit: ApplyRoutesHandler): Promise<void> {
    this.logger.info(`starting web server on port ${this.config.port}`)

    const app: express.Application = express()
    app.set('etag', false)
    app.disable('etag')
    app.disable('x-powered-by')

    await handlerInit(app)
    return new Promise((resolve) => {
      const server = app.listen(this.config.port, () => {
        this.logger.info(`web server started`)
      })
      this.http = stoppable(server, 10000)
      server.keepAliveTimeout = 1000 * (60 * 6)
      server.on('connection', (socket) => {
        // Disable Nagles
        socket.setNoDelay(true)
        socket.setTimeout(600 * 60 * 1000)
      })
      resolve()
    })
  }

  public async stop(): Promise<void> {
    const logger = this.logger

    return new Promise((resolve) => {
      logger.info('stopping web server')
      this.http.stop(() => {
        logger.info('web server stopped')
        resolve()
      })
    })
  }
}
