import {
  DaemonSet,
  DaemonSetSpec,
  Deployment,
  DeploymentSpec,
  StatefulSet,
  StatefulSetSpec
} from 'kubernetes-types/apps/v1'
import {
  Event,
  Node,
  NodeSpec,
  Pod,
  PodSpec,
  Secret,
  Service,
  ServiceSpec
} from 'kubernetes-types/core/v1'
import { Ingress, IngressSpec } from 'kubernetes-types/extensions/v1beta1'
import { ObjectMeta } from 'kubernetes-types/meta/v1'
import {
  NetworkPolicy,
  NetworkPolicySpec
} from 'kubernetes-types/networking/v1'
import { XOR } from 'ts-xor'

export namespace Models {
  type Metadata = Omit<ObjectMeta, 'generateName'> & {
    namespace: string
  }

  /**
   * Represents core fields all objects share
   */
  export interface IBaseResource {
    kind: string
    apiVersion: string
    metadata: Metadata
  }

  /**
   * Generic intersection types which take 'kubernetes-types'
   * interfaces and make their IBaseResource keys mandatory
   */
  type BaseResource<T> = Omit<T, 'metadata'> & IBaseResource
  type BaseResourceWithSpec<T, R> = BaseResource<T> & { spec: R }

  /**
   * Additional fields that are found on already existing resources
   */
  export interface IExistingResource extends IBaseResource {
    metadata: {
      namespace: string
      name: string
      selfLink: string
      creationTimestamp: string
      resourceVersion: string
      uid: string
      labels?: { [key: string]: string }
      annotations?: { [key: string]: string }
      deletionTimestamp?: string
    }
  }

  /**
   * Additional fields required for creating new objects
   */
  export interface INewResource extends IBaseResource {
    metadata: Metadata & XOR<{ name: string }, { generateName: string }>
  }

  export namespace Core {
    /**
     * Represents v1.NetworkPolicy
     */
    export interface INetworkPolicy
      extends BaseResourceWithSpec<NetworkPolicy, NetworkPolicySpec> {}

    /**
     * Represents v1.Pod
     */
    export interface IPod extends BaseResourceWithSpec<Pod, PodSpec> {}

    /**
     * Represents v1.Secret
     */
    export interface ISecret extends BaseResource<Secret> {}

    /**
     * Represents v1.Deployment
     */
    export interface IDeployment
      extends BaseResourceWithSpec<Deployment, DeploymentSpec> {}

    /**
     * Represents v1.StatefulSet
     */
    export interface IStatefulSet
      extends BaseResourceWithSpec<StatefulSet, StatefulSetSpec> {}

    /**
     * Represents v1.DaemonSet
     */
    export interface IDaemonSet
      extends BaseResourceWithSpec<DaemonSet, DaemonSetSpec> {}

    /**
     * Represents v1.Service
     */
    export interface IService
      extends BaseResourceWithSpec<Service, ServiceSpec> {}

    /**
     * Represents networking.k8s.io/v1beta1.Ingress or extensions/v1beta1.Ingress
     */
    export interface IIngress
      extends BaseResourceWithSpec<Omit<Ingress, 'apiVersion'>, IngressSpec> {
      apiVersion: 'networking.k8s.io/v1beta1' | 'extensions/v1beta1'
    }

    /**
     * Represents v1.Node
     */
    export interface INode extends BaseResourceWithSpec<Node, NodeSpec> {}

    /**
     * Represents v1.Event
     */
    export interface IEvent extends BaseResource<Event> {}
  }
}
