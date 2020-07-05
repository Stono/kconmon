import { IDiscovery, IAgent } from 'lib/discovery'
import { IConfig } from 'lib/config'
import { Models } from 'lib/kubernetes/models'
import IKubernetesClient, { KubernetesEventType } from 'lib/kubernetes/client'
import Logger from 'lib/logger'

export type PodAgentMapper = (pod: Models.Core.IPod) => IAgent

export interface IKubernetesDiscovery extends IDiscovery {
  reconcileNodes()
}

export default class KubernetesDiscovery implements IKubernetesDiscovery {
  private client: IKubernetesClient
  private logger = new Logger('discovery')
  private podCache: { [key: string]: IAgent } = {}
  private nodeCache: {
    [key: string]: { [key: string]: string }
  } = {}
  private config: IConfig
  constructor(config: IConfig, client: IKubernetesClient) {
    this.client = client
    this.config = config
  }

  public async agents(): Promise<IAgent[]> {
    return Object.keys(this.podCache).map((key) => {
      return this.podCache[key]
    })
  }

  public async agent(name: string): Promise<IAgent | null> {
    const pod = await this.client.get<Models.Core.IPod>(
      'v1',
      'Pod',
      this.config.namespace,
      name
    )
    if (!pod) {
      return null
    }
    return this.mapToAgent(pod)
  }

  public async start(): Promise<void> {
    const handleNodeEvent = async (
      node: Models.Core.INode,
      eventType: KubernetesEventType
    ) => {
      if (eventType === KubernetesEventType.DELETED) {
        this.logger.info(`node ${node.metadata.name} was removed`)
        delete this.nodeCache[node.metadata.name as string]
      }
      if (eventType === KubernetesEventType.ADDED) {
        this.logger.info(`node ${node.metadata.name} was added`)
        this.nodeCache[node.metadata.name as string] =
          node.metadata.labels || {}
      }
      if (eventType === KubernetesEventType.MODIFIED) {
        this.nodeCache[node.metadata.name as string] =
          node.metadata.labels || {}
      }
    }
    await this.client.watch<Models.Core.INode>('v1', 'Node', handleNodeEvent)
    await this.reconcileNodes()

    const handlePodEvent = async (
      pod: Models.Core.IPod,
      eventType: KubernetesEventType
    ) => {
      if (!pod.metadata.labels || pod.metadata.labels.component !== 'agent') {
        return
      }

      if (eventType === KubernetesEventType.DELETED) {
        const agent = this.podCache[pod.metadata.name as string]
        if (agent) {
          this.logger.info(`agent removed`, agent)
          delete this.podCache[pod.metadata.name as string]
        }
      } else {
        this.handleAgent(pod)
      }
    }
    await this.client.watch<Models.Core.IPod>(
      'v1',
      'Pod',
      handlePodEvent,
      [KubernetesEventType.ALL],
      this.config.namespace
    )
    await this.client.start()
    await this.reconcileAgents()
  }

  public async stop(): Promise<void> {
    return this.client.stop()
  }

  private handleAgent(pod: Models.Core.IPod): void {
    if (
      pod.status &&
      pod.status.phase === 'Running' &&
      pod.status.containerStatuses &&
      pod.status.containerStatuses[0].ready
    ) {
      const result = this.mapToAgent(pod)
      if (!result) {
        return
      }
      if (!this.podCache[pod.metadata.name as string]) {
        this.podCache[pod.metadata.name as string] = result
        this.logger.info(`agent added`, result)
      }
    } else {
      delete this.podCache[pod.metadata.name as string]
    }
  }

  public async reconcileNodes(): Promise<void> {
    this.logger.info('reconciling nodes from kubernetes')
    const nodes = await this.client.select<Models.Core.INode>('v1', 'Node')
    nodes.forEach((node) => {
      this.nodeCache[node.metadata.name] = node.metadata.labels || {}
    })
    this.logger.info(`${nodes.length} nodes loaded`)
  }

  private async reconcileAgents(): Promise<void> {
    this.logger.info('reconciling pods from kubernetes')
    const pods = await this.client.select<Models.Core.IPod>(
      'v1',
      'Pod',
      this.config.namespace,
      `app=kconmon,component=agent`
    )

    pods.forEach((pod) => {
      this.handleAgent(pod)
    })

    Object.keys(this.podCache).forEach((key) => {
      if (!pods.find((pod) => pod.metadata.name === key)) {
        delete this.podCache[key]
      }
    })

    this.logger.info(`${Object.keys(this.podCache).length} agents discovered`)
  }

  private mapToAgent(pod: Models.Core.IPod): IAgent | null {
    if (!pod.spec.nodeName) {
      return null
    }
    const node = this.nodeCache[pod.spec.nodeName]
    if (!node) {
      return null
    }
    let zone = 'unknown'
    const failureDomain = node[this.config.failureDomainLabel]
    if (failureDomain) {
      zone = failureDomain
    } else {
      this.logger.warn(
        `Unable to find failure domain label (${failureDomain}) on node`
      )
    }

    return {
      name: pod.metadata.name as string,
      nodeName: pod.spec.nodeName as string,
      ip: pod.status?.podIP as string,
      zone
    }
  }
}
