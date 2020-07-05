export interface IMetrics {
  handleTCPTestSuccess(result: ITCPTestSuccessResult)
  handleTCPTestFailure(result: ITCPTestFailResult)
  handleUDPTestResult(result: IUDPTestResult)
  handleDNSTestResult(result: IDNSTestResult)
  toString()
  resetTCPMetrics()
  resetUDPMetrics()
}

import * as client from 'prom-client'
import {
  ITCPTestSuccessResult,
  ITCPTestFailResult,
  IUDPTestResult,
  IDNSTestResult
} from 'lib/tester'
import { IConfig } from 'lib/config'

export default class Metrics implements IMetrics {
  private TCPConnect: client.Gauge<string>
  private TCPDuration: client.Gauge<string>
  private failCounter: client.Counter<string>
  private UDPDuration: client.Gauge<string>
  private UDPVariance: client.Gauge<string>
  private UDPLoss: client.Gauge<string>
  private DNS: client.Counter<string>

  constructor(config: IConfig) {
    client.register.clear()
    this.TCPConnect = new client.Gauge<string>({
      help: 'Time taken to establish the TCP socket',
      labelNames: ['source', 'destination', 'source_zone', 'destination_zone'],
      name: `${config.metricsPrefix}_tcp_connect_milliseconds`
    })

    this.TCPDuration = new client.Gauge<string>({
      help: 'Total time taken to complete the TCP test',
      labelNames: ['source', 'destination', 'source_zone', 'destination_zone'],
      name: `${config.metricsPrefix}_tcp_duration_milliseconds`
    })

    this.UDPDuration = new client.Gauge<string>({
      help: ' Average duration per packet',
      labelNames: ['source', 'destination', 'source_zone', 'destination_zone'],
      name: `${config.metricsPrefix}_udp_duration_milliseconds`
    })

    this.UDPVariance = new client.Gauge<string>({
      help: 'UDP variance between the slowest and fastest packet',
      labelNames: ['source', 'destination', 'source_zone', 'destination_zone'],
      name: `${config.metricsPrefix}_udp_duration_variance_milliseconds`
    })

    this.UDPLoss = new client.Gauge<string>({
      help: 'UDP packet loss',
      labelNames: ['source', 'destination', 'source_zone', 'destination_zone'],
      name: `${config.metricsPrefix}_udp_loss`
    })

    this.DNS = new client.Counter<string>({
      help: 'DNS Test Results',
      labelNames: ['source', 'host', 'result'],
      name: `${config.metricsPrefix}_dns_results_total`
    })

    this.failCounter = new client.Counter<string>({
      help: 'Counter of failed tests',
      labelNames: [
        'type',
        'source',
        'destination',
        'source_zone',
        'destination_zone'
      ],
      name: `${config.metricsPrefix}_fail_total`
    })
  }

  public resetTCPMetrics(): void {
    this.TCPConnect.reset()
    this.TCPDuration.reset()
  }

  public resetUDPMetrics(): void {
    this.UDPDuration.reset()
    this.UDPLoss.reset()
    this.UDPVariance.reset()
  }

  public handleDNSTestResult(result: IDNSTestResult): void {
    const source = result.source.nodeName
    this.DNS.labels(source, result.host, result.result).inc(1)
  }

  public handleUDPTestResult(result: IUDPTestResult): void {
    const source = result.source.nodeName
    const destination = result.destination.nodeName
    const sourceZone = result.source.zone
    const destinationZone = result.destination.zone
    if (result.timings.success === false) {
      this.failCounter
        .labels('udp', source, destination, sourceZone, destinationZone)
        .inc(1)
    }

    this.UDPDuration.labels(
      source,
      destination,
      sourceZone,
      destinationZone
    ).set(result.timings.average)
    this.UDPVariance.labels(
      source,
      destination,
      sourceZone,
      destinationZone
    ).set(result.timings.variance)
    this.UDPLoss.labels(source, destination, sourceZone, destinationZone).set(
      result.timings.loss
    )
  }

  public handleTCPTestSuccess(result: ITCPTestSuccessResult): void {
    const source = result.source.nodeName
    const destination = result.destination.nodeName
    const sourceZone = result.source.zone
    const destinationZone = result.destination.zone
    this.TCPConnect.labels(
      source,
      destination,
      sourceZone,
      destinationZone
    ).set(
      ((result.timings.connect ||
        result.timings.socket ||
        result.timings.start) - result.timings.start) as number
    )
    this.TCPDuration.labels(
      source,
      destination,
      sourceZone,
      destinationZone
    ).set(result.timings.phases.total as number)
  }

  public handleTCPTestFailure(result: ITCPTestFailResult): void {
    const source = result.source.nodeName
    const destination = result.destination.nodeName
    const sourceZone = result.source.zone
    const destinationZone = result.destination.zone
    this.failCounter
      .labels('tcp', source, destination, sourceZone, destinationZone)
      .inc(1)
  }

  public toString(): string {
    return client.register.metrics()
  }
}
