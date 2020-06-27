import * as udp from 'dgram'
import Logger, { ILogger } from 'lib/logger'

export interface IUDPClient {
  ping(
    host: string,
    port: number,
    timeoutMs: number,
    times: number
  ): Promise<IUDPPingResult>
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

  public async ping(
    host: string,
    port: number,
    timeoutMs: number,
    times: number
  ): Promise<IUDPPingResult> {
    const client = udp.createSocket('udp4')
    const results: IUDPSinglePingResult[] = []
    const sendPing = () => {
      return new Promise<number>((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.logger.error('Timed out waiting for udp response')
          reject(new Error('TIMEOUT'))
        }, timeoutMs)

        const data = Buffer.from('ping')
        let hrstart = process.hrtime()

        client.on('message', () => {
          const hrend = process.hrtime(hrstart)
          clearTimeout(timeout)
          resolve(hrend[1] / 1000000)
        })

        hrstart = process.hrtime()
        client.send(data, port, host, (error) => {
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
          client.removeAllListeners()
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
    } finally {
      client.close()
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
