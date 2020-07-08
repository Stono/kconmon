import Logger from 'lib/logger'

const logger = new Logger('config')
const env = process.env.CONFIG

let json = {}
if (env) {
  json = JSON.parse(env)
} else {
  logger.warn('No environment configuration found, will be using defaults')
}

const getEnv = (key: string, defaultValue: any) => {
  return json[key] || defaultValue
}

interface ITestConfiguration {
  tcp: {
    interval: number
    timeout: number
  }
  udp: {
    interval: number
    timeout: number
    packets: number
  }
  dns: {
    interval: number
    hosts: string[]
  }
  icmp: {
    interval: number
    count: number
    timeout: number
    hosts: string[]
  }
  custom_tcp: {
    interval: number
    timeout: number
    hosts: string[]
  }
}

export interface IConfig {
  port: number
  metricsPrefix: string
  namespace: string
  environment: string
  failureDomainLabel: string
  nodeAntiAffinity: {
    [key: string]: string
    value: any
  }[]
  testConfig: ITestConfiguration
}

export class Config implements IConfig {
  public readonly port: number = getEnv('port', 8080)
  public readonly namespace: string =
    process.env.DEPLOYMENT_NAMESPACE || 'kconmon'
  public readonly metricsPrefix: string = getEnv('metricsPrefix', 'kconmon')
  public readonly environment: string = getEnv('environment', 'testing')
  public readonly failureDomainLabel: string = getEnv(
    'failureDomainLabel',
    'failure-domain.beta.kubernetes.io/zone'
  )
  public readonly nodeAntiAffinity: {
    [key: string]: string
    value: any
  }[] = getEnv('nodeAntiAffinity', [])
  public readonly testConfig: ITestConfiguration = {
    tcp: getEnv('tcp', { interval: 5000, timeout: 1000 }),
    udp: getEnv('udp', { interval: 5000, timeout: 250, packets: 10 }),
    dns: getEnv('dns', { interval: 5000, hosts: [] }),
    icmp: getEnv('icmp', { interval: 5000, hosts: [] }),
    custom_tcp: getEnv('custom_tcp', { interval: 5000, timeout: 1000, hosts: [] })
  }
}

const config = new Config()
logger.info(
  `Configuration: port=${config.port}, namespace=${config.namespace}, failureDomainLabel=${config.failureDomainLabel}`
)
export default config
