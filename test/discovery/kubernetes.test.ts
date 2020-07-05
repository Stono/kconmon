import * as td from 'testdouble'
import { IConfig } from 'lib/config'
import KubernetesDiscovery, {
  IKubernetesDiscovery
} from 'lib/discovery/kubernetes'
import IKubernetesClient from 'lib/kubernetes/client'
import { Models } from 'lib/kubernetes/models'
import * as should from 'should'

describe('Discovery: Kubernetes', () => {
  let sut: IKubernetesDiscovery
  let client: IKubernetesClient
  before(() => {
    const config = td.object<IConfig>()
    config.namespace = 'test'
    config.port = 8080
    config.failureDomainLabel = 'failure-domain.beta.kubernetes.io/zone'
    client = td.object<IKubernetesClient>()
    sut = new KubernetesDiscovery(config, client)
  })

  it('should get the details of a single agent', async () => {
    const pod = td.object<Models.Core.IPod & Models.IExistingResource>()
    pod.metadata = td.object<Models.IExistingResource['metadata']>()
    pod.metadata.name = 'bacon-pod'
    pod.spec.nodeName = 'bacon-node'

    const podStatusAsAny = pod.status as any
    podStatusAsAny.podIP = '1.2.3.4'

    const node = td.object<Models.Core.INode & Models.IExistingResource>()
    node.metadata = td.object<Models.IExistingResource['metadata']>()
    node.metadata.name = 'bacon-node'
    node.metadata.labels = {
      'failure-domain.beta.kubernetes.io/zone': 'europe-west4-a'
    }

    td.when(client.select<Models.Core.INode>('v1', 'Node')).thenResolve([node])
    td.when(
      client.get<Models.Core.IPod>('v1', 'Pod', 'test', 'kconmon-g88mt')
    ).thenResolve(pod)

    await sut.reconcileNodes()
    const agent = await sut.agent('kconmon-g88mt')
    should(agent).eql({
      name: 'bacon-pod',
      nodeName: 'bacon-node',
      ip: '1.2.3.4',
      zone: 'europe-west4-a'
    })
  })
})
