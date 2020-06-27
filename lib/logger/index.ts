import * as fs from 'fs'
export interface ILogger {
  debug(...args)
  info(...args)
  log(...args)
  warn(...args)
  error(...args)
  onCluster: boolean
}

export enum LogLevel {
  debug = 1,
  info = 2,
  warn = 3,
  error = 4,
  none = 5
}

export interface IConsole {
  log(message?: any, ...optionalParams: any[]): void
}

export default class Logger implements ILogger {
  private module: string
  private logLevel: LogLevel = LogLevel.info
  public onCluster = false
  private writer: IConsole

  constructor(
    moduleName: string,
    logLevel?: LogLevel,
    writer: IConsole = console
  ) {
    this.writer = writer
    this.module = moduleName
    const isNull = (item) => {
      return typeof item === 'undefined' || item === null
    }
    if (isNull(logLevel) && process.env.LOG_LEVEL) {
      const stringLevel = process.env.LOG_LEVEL.toString().toLowerCase()
      const level = LogLevel[stringLevel]
      if (isNull(level)) {
        throw new Error(`unknown log level: ${stringLevel}`)
      }
      this.logLevel = level
    } else {
      this.logLevel = logLevel || LogLevel.info
    }

    this.info = this.info.bind(this)
    if (fs.existsSync('/var/run/secrets/kubernetes.io/serviceaccount')) {
      this.onCluster = true
    }
  }

  debug(...args) {
    this.writeLog.bind(this)(LogLevel.debug, args)
  }
  info(...args) {
    this.writeLog.bind(this)(LogLevel.info, args)
  }
  log(...args) {
    this.writeLog.bind(this)(LogLevel.info, args)
  }
  warn(...args) {
    this.writeLog.bind(this)(LogLevel.warn, args)
  }
  error(...args) {
    this.writeLog.bind(this)(LogLevel.error, args)
  }

  private writeLog(level: LogLevel, args: any[]) {
    if (level < this.logLevel) {
      return
    }
    this.logJson(level, args)
  }

  private logJson(level: LogLevel, args: any[]) {
    const stringMessages: string[] = []
    const payload: any = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      module: this.module,
      message: ''
    }

    args.forEach((arg) => {
      if (typeof arg === 'undefined' || arg === null) {
        return
      }
      if (typeof arg === 'object') {
        if (arg instanceof Error) {
          payload.error = {
            name: arg.name,
            message: arg.message
          } as any
          if (arg.stack) {
            payload.error.stack = arg.stack
          }
        } else {
          /* If the argument is a type object, then loop over its keys
            and add them to the payload, unless they're a reserved key
            such as timestamp, module, level or message
            */
          Object.keys(arg).forEach((key) => {
            if (Object.keys(payload).indexOf(key) === -1) {
              payload[key] = arg[key]
            }
          })
        }
        return
      }
      stringMessages.push(arg)
    })
    payload.message = stringMessages.join(' ')

    if (payload.message === '' && payload.error) {
      payload.message = payload.error.message
    }

    if (this.onCluster) {
      this.writer.log(JSON.stringify(payload))
      return
    }
    payload.timestamp = new Date().toUTCString()
    this.writer.log(JSON.stringify(payload, null, 2))
  }
}
