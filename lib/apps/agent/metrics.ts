export interface IMetrics {
  handleTCPTestResult(result: ITCPTestResult)
  handleCustomTCPTestResult(result: ICustomTCPTestResult)
  handleUDPTestResult(result: IUDPTestResult)
  handleDNSTestResult(result: IDNSTestResult)
  handleICMPTestResult(result: IICMPTestResult)
  resetTCPTestResults()
  resetCustomTCPTestResults()
  resetUDPTestResults()
  toString()
}

import * as client from 'prom-client'
import { IICMPTestResult, IUDPTestResult, IDNSTestResult, ITCPTestResult, ICustomTCPTestResult } from 'lib/tester'
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

  private ICMP: client.Counter<string>
  private ICMPDuration: client.Gauge<string>
  private ICMPAverage: client.Gauge<string>
  private ICMPStddv: client.Gauge<string>
  private ICMPLoss: client.Gauge<string>

  private CustomTCP: client.Counter<string>
  private CustomTCPDuration: client.Gauge<string>
  private CustomTCPConnect: client.Gauge<string>

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

    this.ICMP = new client.Counter<string>({
      help: 'ICMP Test Results',
      labelNames: ['source', 'source_zone', 'host', 'result'],
      name: `${config.metricsPrefix}_icmp_results_total`
    })

    this.ICMPDuration = new client.Gauge<string>({
      help: 'Total time taken to complete the ICMP test',
      labelNames: ['source', 'source_zone', 'host'],
      name: `${config.metricsPrefix}_icmp_duration_milliseconds`
    })

    this.ICMPAverage = new client.Gauge<string>({
      help: 'ICMP average packet RTT',
      labelNames: ['source', 'destination', 'host'],
      name: `${config.metricsPrefix}_icmp_average_rtt_milliseconds`
    })

    this.ICMPStddv = new client.Gauge<string>({
      help: 'ICMP standard deviation of RTT',
      labelNames: ['source', 'destination', 'host'],
      name: `${config.metricsPrefix}_icmp_standard_deviation_rtt_milliseconds`
    })

    this.ICMPLoss = new client.Gauge<string>({
      help: 'ICMP packet loss',
      labelNames: ['source', 'destination', 'host'],
      name: `${config.metricsPrefix}_icmp_packet_loss`
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

    this.CustomTCP = new client.Counter<string>({
      help: 'Custom TCP Test Results',
      labelNames: [
        'source',
        'destination',
        'source_zone',
        'destination_zone',
        'result'
      ],
      name: `${config.metricsPrefix}_custom_tcp_results_total`
    })

    this.CustomTCPConnect = new client.Gauge<string>({
      help: 'Time taken to establish the TCP socket for custom test',
      labelNames: ['source', 'destination', 'source_zone', 'destination_zone'],
      name: `${config.metricsPrefix}_custom_tcp_connect_milliseconds`
    })

    this.CustomTCPDuration = new client.Gauge<string>({
      help: 'Total time taken to complete the custom TCP test',
      labelNames: ['source', 'destination', 'source_zone', 'destination_zone'],
      name: `${config.metricsPrefix}_custom_tcp_duration_milliseconds`
    })

  }

  public handleICMPTestResult(result: IICMPTestResult): void {
    const source = result.source.nodeName
    this.ICMP.labels(source, result.source.zone, result.host, result.result).inc(
      1
    )
    this.ICMPDuration.labels(
      result.source.nodeName,
      result.source.zone,
      result.host
    ).set(result.duration)

    this.ICMPAverage.labels(
      result.source.nodeName,
      result.source.zone,
      result.host
    ).set(result.avg)
    
    this.ICMPStddv.labels(
      result.source.nodeName,
      result.source.zone,
      result.host
    ).set(result.stddev)

    this.ICMPLoss.labels(
      result.source.nodeName,
      result.source.zone,
      result.host
    ).set(result.loss)
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

  public handleCustomTCPTestResult(result: ICustomTCPTestResult): void {
    const source = result.source.nodeName
    const destination = result.destination
    const sourceZone = result.source.zone
    const destinationZone = result.destination
    this.CustomTCP.labels(
      source,
      destination,
      sourceZone,
      destinationZone,
      result.result
    ).inc(1)

    if (result.timings) {
      this.CustomTCPConnect.labels(
        source,
        destination,
        sourceZone,
        destinationZone
      ).set(
        ((result.timings.connect ||
          result.timings.socket ||
          result.timings.start) - result.timings.start) as number
      )
      this.CustomTCPDuration.labels(
        source,
        destination,
        sourceZone,
        destinationZone
      ).set(result.timings.phases.total as number)
    }
  }

  public resetCustomTCPTestResults() {
    this.CustomTCPConnect.reset()
    this.CustomTCPDuration.reset()
  }

  public toString(): string {
    return client.register.metrics()
  }
}
