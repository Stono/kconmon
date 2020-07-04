import * as udp from 'dgram'
import Logger, { ILogger } from 'lib/logger'

export interface IUDPClient {
  ping(timeoutMs: number, times: number): Promise<IUDPPingResult>
  destroy(): void
}

export interface IUDPSinglePingResult {
  success: boolean
  duration: number
}

export interface IUDPPingResult {
  results: IUDPSinglePingResult[]
  success: boolean
  min: number
  max: number
  average: number
  duration: number
  variance: number
  loss: number
}

const delay = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export default class UDPClient implements IUDPClient {
  private logger: ILogger = new Logger('udp-client')
  private host: string
  private port: number
  private client: udp.Socket

  constructor(host: string, port: number) {
    this.host = host
    this.port = port
    this.client = udp.createSocket('udp4')
  }

  public destroy() {
    try {
      this.client.close()
    } catch (ex) {
      this.logger.error('failed to close client', ex)
    }
  }

  public async ping(timeoutMs: number, times: number): Promise<IUDPPingResult> {
    const results: IUDPSinglePingResult[] = []
    const sendPing = () => {
      return new Promise<number>((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.logger.error('Timed out waiting for udp response')
          reject(new Error('TIMEOUT'))
        }, timeoutMs)

        const data = Buffer.from('ping')
        let hrstart = process.hrtime()

        this.client.on('message', () => {
          const hrend = process.hrtime(hrstart)
          clearTimeout(timeout)
          resolve(hrend[1] / 1000000)
        })

        hrstart = process.hrtime()
        this.client.send(data, this.port, this.host, (error) => {
          if (error) {
            this.logger.error('failed to send udp packet', error)
            reject(error)
          }
        })
      })
        .then((duration: number) => {
          return {
            success: true,
            duration
          }
        })
        .catch(() => {
          return {
            success: false,
            duration: timeoutMs
          }
        })
        .finally(() => {
          this.client.removeAllListeners()
        })
    }

    try {
      // send one noddy packet to warm code path and reduce variance
      // due to the first test being slightly slower
      await sendPing().catch()
      for (let i = 0; i < times; i += 1) {
        await sendPing().then((result) => {
          results.push(result)
        })
        await delay(50)
      }
    } catch (ex) {
      this.logger.error('failed to ping', ex)
    } finally {
      this.client.removeAllListeners()
    }

    const durations = results.map((result) => result.duration).sort()
    const returnValue = {
      results,
      success: true,
      loss:
        (results.filter((result) => !result.success).length / results.length) *
        100,
      min: durations[0] as number,
      max: durations.reverse()[0] as number,
      average: durations.reduce((a, b) => a + b, 0) / durations.length,
      variance: 0,
      duration: durations.reduce((a, b) => a + b, 0)
    }
    returnValue.success = returnValue.loss === 0
    returnValue.variance = returnValue.max - returnValue.min
    return returnValue
  }
}
