export interface IMetrics {
  handleTCPTestResult(result: ITCPTestResult)
  handleUDPTestResult(result: IUDPTestResult)
  handleDNSTestResult(result: IDNSTestResult)
  resetTCPTestResults()
  resetUDPTestResults()
  toString()
}

import * as client from 'prom-client'
import { IUDPTestResult, IDNSTestResult, ITCPTestResult } from 'lib/tester'
import { IConfig } from 'lib/config'

export default class Metrics implements IMetrics {
  private TCP: client.Counter<string>
  private TCPDuration: client.Gauge<string>
  private TCPConnect: client.Gauge<string>

  private UDP: client.Counter<string>
  private UDPDuration: client.Gauge<string>
  private UDPVariance: client.Gauge<string>
  private UDPLoss: client.Gauge<string>

  private DNS: client.Counter<string>
  private DNSDuration: client.Gauge<string>

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
      help: 'Average duration per packet',
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
      labelNames: ['source', 'source_zone', 'host', 'result'],
      name: `${config.metricsPrefix}_dns_results_total`
    })

    this.DNSDuration = new client.Gauge<string>({
      help: 'Total time taken to complete the DNS test',
      labelNames: ['source', 'source_zone', 'host'],
      name: `${config.metricsPrefix}_dns_duration_milliseconds`
    })

    this.UDP = new client.Counter<string>({
      help: 'UDP Test Results',
      labelNames: [
        'source',
        'destination',
        'source_zone',
        'destination_zone',
        'result'
      ],
      name: `${config.metricsPrefix}_udp_results_total`
    })

    this.TCP = new client.Counter<string>({
      help: 'TCP Test Results',
      labelNames: [
        'source',
        'destination',
        'source_zone',
        'destination_zone',
        'result'
      ],
      name: `${config.metricsPrefix}_tcp_results_total`
    })
  }

  public handleDNSTestResult(result: IDNSTestResult): void {
    const source = result.source.nodeName
    this.DNS.labels(source, result.source.zone, result.host, result.result).inc(
      1
    )
    this.DNSDuration.labels(
      result.source.nodeName,
      result.source.zone,
      result.host
    ).set(result.duration)
  }

  public resetTCPTestResults() {
    this.TCPConnect.reset()
    this.TCPDuration.reset()
  }

  public resetUDPTestResults() {
    this.UDPDuration.reset()
    this.UDPLoss.reset()
    this.UDPVariance.reset()
  }

  public handleUDPTestResult(result: IUDPTestResult): void {
    const source = result.source.nodeName
    const destination = result.destination.nodeName
    const sourceZone = result.source.zone
    const destinationZone = result.destination.zone
    this.UDP.labels(
      source,
      destination,
      sourceZone,
      destinationZone,
      result.result
    ).inc(1)

    if (result.timings) {
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
  }

  public handleTCPTestResult(result: ITCPTestResult): void {
    const source = result.source.nodeName
    const destination = result.destination.nodeName
    const sourceZone = result.source.zone
    const destinationZone = result.destination.zone
    this.TCP.labels(
      source,
      destination,
      sourceZone,
      destinationZone,
      result.result
    ).inc(1)

    if (result.timings) {
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
  }

  public toString(): string {
    return client.register.metrics()
  }
}
