import * as udp from 'dgram'
import { IConfig } from 'lib/config'
import Logger, { ILogger } from 'lib/logger'

export interface IUDPServer {
  start(): void
  stop(): void
}

export default class UDPServer implements IUDPServer {
  private server: udp.Socket
  private logger: ILogger = new Logger('udp-server')
  private config: IConfig

  constructor(config: IConfig) {
    this.config = config
    this.server = udp.createSocket('udp4')

    this.server.on('error', (error) => {
      throw error
    })

    this.server.on('message', (msg, info) => {
      this.server.send(msg, info.port, info.address, (error) => {
        if (error) {
          this.logger.error('UDP reply failed', error)
        }
      })
    })
  }

  /* eslint max-statements: off */
  public async start(): Promise<void> {
    return new Promise((resolve) => {
      this.logger.info(`starting udp server on port ${this.config.port}`)
      this.server.bind(this.config.port, '0.0.0.0', () => {
        this.logger.info(`udp server started`)
        resolve()
      })
    })
  }

  public async stop(): Promise<void> {
    this.logger.info('stopping udp server')
    return new Promise((resolve) => {
      this.server.close(() => {
        this.logger.info('udp server stopped')
        resolve()
      })
    })
  }
}
