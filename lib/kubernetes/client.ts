const Client = require('kubernetes-client').Client
const { KubeConfig } = require('kubernetes-client')

import * as fs from 'fs'
import Request from './monkeypatch/client'
import { Models } from './models'
import { Readable } from 'stream'
import Logger, { ILogger } from 'lib/logger'

export enum KubernetesEventType {
  ALL,
  ADDED,
  MODIFIED,
  DELETED
}

export enum PatchType {
  MergePatch,
  JsonPatch
}

export interface IKubernetesWatchEvent<T extends Models.IExistingResource> {
  type: string
  object: T
}

interface IExecResult {
  stdout: string
  stderr: string
  error: string
  code: number
}

interface IWatchOptions {
  timeout: number
  qs: {
    resourceVersion?: string
  }
}

interface IGodaddyPostResult {
  messages: any[]
}

export interface IGodaddyClient {
  loadSpec()
  addCustomResourceDefinition(spec: Models.IExistingResource)
  apis: {
    [apiName: string]: { [version: string]: any }
  }
  api: { [version: string]: any }
}

export interface IGodaddyWatch {
  getObjectStream(options: {
    timeout?: number
    qs: {
      resourceVersion?: string
    }
  }): Promise<Readable>
}

export interface IGodaddyApi {
  get(options?: { qs: { labelSelector: string } })
  delete()
  post(body: any)
  patch(data: any)
  watch: any
  namespaces(name: string)
  exec: {
    post(options: {
      qs: {
        command: any
        container: string
        stdout: boolean
        stderr: boolean
      }
    }): Promise<IGodaddyPostResult>
  }
}

export enum PodPhase {
  Pending,
  Running,
  Succeeded,
  Failed,
  Unknown
}

declare type ResourceCallback<T extends Models.IBaseResource> = (
  resource: T & Models.IExistingResource,
  eventType: KubernetesEventType
) => void
declare type EventCallback<T extends Models.IBaseResource> = (
  event: IKubernetesWatchEvent<T & Models.IExistingResource>
) => void

export interface IKubernetes {
  /**
   * Returns a single kubernetes resource
   * @param {string} api The Kubernetes API to target
   * @param {T['apiVersion']} apiVersion The version of that API
   * @param {T['kind']} kind The Kind of object to select
   * @param {string} namespace The namespace to go to
   * @param {string} name The name of the object
   * @returns {Promise<(T & Models.IExistingResource) | null>} The object, or undefined if not found
   */
  get<T extends Models.IBaseResource>(
    apiVersion: T['apiVersion'],
    kind: T['kind'],
    namespace: string,
    name: string
  ): Promise<(T & Models.IExistingResource) | null>

  /**
   * Executes a command inside a pod, and returns the result
   * @param {string} namespace The namespace to go to
   * @param {string} name The name of the pod
   * @param {string} container The name of the container
   * @param {string[]} command The command to execute
   * @returns {Promise<IExecResult>} An object containing the stdout, stderr and exit codes
   */
  exec(
    namespace: string,
    name: string,
    container: string,
    command: string[]
  ): Promise<IExecResult>

  /**
   * Returns a collection of kubernetes resources based on the selection criteria
   * @param {T['apiVersion']} apiVersion The version of that API
   * @param {T['kind']} kind The Kind of object to select
   * @param {string?} namespace (optional) The namespace to restrict to
   * @param {string?} labelSelector (optional) The label to select, eg app=your-app
   * @returns {Promise<(T & Models.IExistingResource)[]>} An array of Kubernetes resources
   */
  select<T extends Models.IBaseResource>(
    apiVersion: T['apiVersion'],
    kind: T['kind'],
    namespace?: string | null | undefined,
    labelSelector?: string | null | undefined
  ): Promise<(T & Models.IExistingResource)[]>

  /**
   * Patch a kubernetes resource
   * @param {T['apiVersion']} apiVersion The version of that API
   * @param {T['kind']} kind The Kind of object to select
   * @param {string} namespace The namespace to go to
   * @param {string} name The name of the object
   * @param {PatchType} patchType The type of patch operation to run
   * @param {any} patch The patch to apply
   * @returns {Promise<void>} A promise to indicate if the request was successful or not
   */
  patch<T extends Models.IBaseResource>(
    apiVersion: T['apiVersion'],
    kind: T['kind'],
    namespace: string,
    name: string,
    patchType: PatchType.MergePatch,
    patch: any
  ): Promise<void>
  patch<T extends Models.IBaseResource>(
    apiVersion: T['apiVersion'],
    kind: T['kind'],
    namespace: string,
    name: string,
    patchType: PatchType.JsonPatch,
    patch: jsonpatch.OpPatch[]
  ): Promise<void>

  /**
   * Patch a kubernetes resource
   * @param {T['apiVersion']} apiVersion The version of that API
   * @param {T['kind']} kind The Kind of object to select
   * @param {string} namespace The namespace to go to
   * @param {string} name The name of the object
   * @param {string} type The status name
   * @param {string} status The status value
   * @returns {Promise<void>} A promise to indicate if the request was successful or not
   */
  addStatusCondition<T extends Models.IBaseResource>(
    apiVersion: T['apiVersion'],
    kind: T['kind'],
    namespace: string,
    name: string,
    type: string,
    status: string
  ): Promise<void>

  /**
   * Create a new kubernetes resource
   * @param {T & Models.INewResource} manifest The manifest to create
   * @returns {Promise<void>} A promise to indicate if the request was successful or not
   */
  create<T extends Models.IBaseResource>(
    manifest: T & Models.INewResource
  ): Promise<void>

  /**
   * Removes a kubernetes resource from the cluster
   * @param {T['apiVersion']} apiVersion The version of that API
   * @param {T['kind']} kind The Kind of object to select
   * @param {string} namespace The namespace to go to
   * @param {string} name The name of the object
   * @returns {Promise<void>} A promise to indicate if the request was successful or not
   */
  delete<T extends Models.IBaseResource>(
    apiVersion: T['apiVersion'],
    kind: T['kind'],
    namespace: string,
    name: string
  ): Promise<void>

  /**
   * Watch the kubernetes API for a given resource type
   * Will handle auto reconnection
   * @param {T['apiVersion']} apiVersion The version of that API
   * @param {T['kind']} kind The Kind of object to select
   * @param {ResourceCallback} handler The handler that will be invoked with the resource
   * @param {KubernetesEventType[]} eventType The types to watch for (default: MODIFIED, ADDED, DELETED)
   * @param {string?} namespace The namespace to restrict the watch to
   * @returns {Promise<void>} A promise to indicate if the watch was setup successfully or not
   */
  watch<T extends Models.IBaseResource>(
    apiVersion: T['apiVersion'],
    kind: T['kind'],
    handler: ResourceCallback<T & Models.IExistingResource>,
    eventTypes?: KubernetesEventType[],
    namespace?: string | null
  ): Promise<void>

  /**
   * Starts all watch streams
   * @returns {Promise<void>} A promise which returns when all watch operations have started
   */
  start()

  /**
   * Stops all watch streams
   * @returns {Promise<void>} A promise that returns when all watch operations have stopped
   */
  stop()

  /**
   * Waits for a pod to enter a particular phase
   * @param {string} namespace The namespace to go to
   * @param {string} name The name of the object
   * @param {PodPhase?} phase The phase to wait for, defaults to Running
   * @param {number?} maxTime The maximum amount of time in milliseconds to wait
   * @returns {Promise<void>} A promise that returns when the desired state is met
   */
  waitForPodPhase(
    namespace: string,
    name: string,
    phase?: PodPhase,
    maxTime?: number
  ): Promise<void>

  /**
   * Waits for something to rollout
   * @param {T['apiVersion']} apiVersion The version of that API
   * @param {T['kind']} kind The Kind of object to select
   * @param {string} namespace The namespace to go to
   * @param {string} name The name of the object
   * @param {number?} maxTime The maximum amount of time in milliseconds to wait
   * @returns {Promise<void>} A promise that returns when all replicas are up to date
   */
  waitForRollout<T extends Models.Core.IDeployment>(
    apiVersion: T['apiVersion'],
    kind: T['kind'],
    namespace: string,
    name: string,
    maxTime?: number
  ): Promise<void>

  /**
   * Waits for a load balancer service to be assigned an external ip
   *
   * Non-load balancer services return immediately
   * @param {string} namespace The namespace to go to
   * @param {string} name The name of the object
   * @param {number?} maxTime The maximum amount of time in milliseconds to wait
   * @returns {Promise<void>} A promise that returns once a load balancer ip is assigned
   */
  waitForServiceLoadBalancerIp(
    namespace: string,
    name: string,
    maxTime?: number
  ): Promise<void>

  /**
   * Trigger a rollout of a pod controller
   * @param {T['apiVersion']} apiVersion The version of that API
   * @param {T['kind']} kind the Kind of object to rollout
   * @param {string} namespace The namespace to go to
   * @param {string} name The name of the object
   * @returns {Promise<void>} A promise that returns once a rollout has been triggered
   */
  rollout<
    T extends
      | Models.Core.IDeployment
      | Models.Core.IStatefulSet
      | Models.Core.IDaemonSet
  >(
    apiVersion: T['apiVersion'],
    kind: T['kind'],
    namespace: string,
    name: string
  ): Promise<void>
}

export default class Kubernetes implements IKubernetes {
  private client: IGodaddyClient
  private streamsToStart: (() => Promise<void>)[] = []
  private streams: Readable[] = []
  private initialised = false
  private initialising = false
  private logger: ILogger
  private loadCustomResources = false

  // The timeout for GET, POST, PUT, PATCH, DELETE
  private requestTimeout = 5000
  // The timeout for WATCH
  private watchTimeout = 60000
  // How long will we wait for watch reconnections before erroring
  private watchReconnectTimeout = 300000

  constructor(
    options: {
      loadCustomResources?: boolean
      client?: IGodaddyClient
    } = {}
  ) {
    this.logger = new Logger('client')
    this.loadCustomResources = options.loadCustomResources || false

    const request = { timeout: this.requestTimeout }
    if (options.client) {
      this.client = options.client
      this.logger.info('using injected client')
      return
    }
    if (fs.existsSync('/var/run/secrets/kubernetes.io/serviceaccount')) {
      this.logger.info('using service account')
      const kubeconfig = new KubeConfig()
      kubeconfig.loadFromCluster()
      const backend = new Request({ kubeconfig, request })
      this.client = new Client({ backend })
    } else {
      this.logger.info('using kube config')
      const kubeconfig = new KubeConfig()
      kubeconfig.loadFromDefault()
      const backend = new Request({ kubeconfig, request })
      this.client = new Client({ backend })
    }
  }

  private async init(): Promise<void> {
    if (this.initialised) {
      return
    } else if (this.initialising) {
      this.logger.debug(
        'another instance of init is running, waiting for it to complete'
      )
      let waitedFor = 0
      while (!this.initialised) {
        await this.sleep(50)
        waitedFor += 1
        if (waitedFor > 100) {
          throw new Error('waited 5000 ms for init to complete, it didnt')
        }
      }
      return
    }
    this.initialising = true
    this.logger.debug('loading kubernetes spec')
    await this.client.loadSpec()
    if (this.loadCustomResources) {
      this.logger.debug('spec loaded, loading crds')
      const query = await (this.client.apis['apiextensions.k8s.io']
        .v1beta1 as any).customresourcedefinition.get()
      query.body.items.forEach((crd) => {
        this.client.addCustomResourceDefinition(crd)
      })
      this.logger.debug(`${query.body.items.length} crds loaded`)
    }
    this.logger.debug('loading complete')
    this.initialised = true
  }

  private getApiParameters<T extends Models.IBaseResource>(
    apiVersion: T['apiVersion'],
    kind: T['kind']
  ): { api: string; version: string; kind: string } {
    const [api, version] =
      apiVersion.indexOf('/') > -1 ? apiVersion.split('/') : ['', apiVersion]

    let kindLower = kind.toLowerCase()
    if (kindLower === 'networkpolicy') {
      kindLower = 'networkpolicie'
    }
    return { api, version, kind: kindLower }
  }

  private async getApi<T extends Models.IBaseResource>(
    apiVersion: T['apiVersion'],
    kind: T['kind'],
    namespace?: string,
    name?: string
  ): Promise<IGodaddyApi> {
    await this.init()
    const { api, version, kind: kindLower } = this.getApiParameters(
      apiVersion,
      kind
    )

    this.logger.debug('api handler:', api, version, kindLower, namespace, name)
    let query =
      api === '' ? this.client.api[version] : this.client.apis[api][version]
    if (namespace) {
      query = query.namespaces(namespace)
    }
    const result = await query[kindLower]
    if (!name) {
      if (typeof result === 'undefined') {
        throw new Error(`No handler found for ${version}/${api}/${kindLower}`)
      }
      return result
    }
    if (typeof result === 'undefined') {
      throw new Error(
        `No handler found for ${version}/${api}/${kindLower}/${namespace}/${name}`
      )
    }
    return result(name)
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  private streamFor<T extends Models.IBaseResource>(
    apiVersion: T['apiVersion'],
    kind: T['kind'],
    wrappedHandler: EventCallback<T & Models.IExistingResource>,
    namespace?: string | null
  ) {
    const { api, version, kind: kindLower } = this.getApiParameters(
      apiVersion,
      kind
    )
    const key = `${api}:${version}:${kindLower}`
    const delayBetweenRetries = 1000

    let streamStarted = new Date(new Date().toUTCString())
    let lastResourceVersion: string | null = null
    // The longest we ever want to wait really is 5 minutes as that
    // is the default configuration of etcds cache
    let reconnectRetriesTimeout: NodeJS.Timeout | null = null

    const handleEvent = (
      event: IKubernetesWatchEvent<T & Models.IExistingResource>
    ) => {
      if (!event.object || !event.object.metadata) {
        this.logger.debug(key, 'invalid resource returned', event)
        return
      }

      if (event.type === 'ERROR' && (event.object as any).code === 410) {
        // Resource has gone away, we're using a resourceVersion that is too old
        this.logger.debug(
          key,
          `the last seen resourceVersion: ${lastResourceVersion} was not found in etcd cache`
        )
        lastResourceVersion = null
        return
      }

      const resourceCreationTimestamp = new Date(
        event.object.metadata.creationTimestamp as string
      )

      /* If we are:
       * - In a replay state
       * - And the event is of type ADDED
       * - And the event creation date is < when the stream started
       * then we should ignore the event
       */
      if (
        lastResourceVersion === null &&
        KubernetesEventType[event.type] === KubernetesEventType.ADDED &&
        resourceCreationTimestamp < streamStarted
      ) {
        return
      }

      this.logger.debug(
        `saw resource: ${event.type} ${event.object.metadata.selfLink} ${event.object.metadata.resourceVersion}`
      )

      // Increment the stream last seen version
      lastResourceVersion = event.object.metadata.resourceVersion

      wrappedHandler(event)
    }

    const result =
      api === '' ? this.client.api[version] : this.client.apis[api][version]

    const watchObject = namespace
      ? result.watch.namespaces(namespace)
      : result.watch

    if (!watchObject) {
      throw new Error(`No handler found for ${version}/${api}/${kindLower}`)
    }

    const startReconnectTimeout = () => {
      if (!reconnectRetriesTimeout) {
        reconnectRetriesTimeout = setTimeout(() => {
          this.logger.error(
            key,
            'Failed to reconnect within timeout, exiting process'
          )
          throw new Error(
            `Unable to reconnect ${key} to kubernetes after ${
              this.watchReconnectTimeout / 1000
            }s`
          )
        }, this.watchReconnectTimeout)
      }
    }

    const endReconnectTimeout = () => {
      if (reconnectRetriesTimeout) {
        clearTimeout(reconnectRetriesTimeout)
        reconnectRetriesTimeout = null
      }
    }

    const watch: IGodaddyWatch = watchObject[kindLower]
    const reconnect = async (
      retryCount: number,
      streamPromise: (retryCount: number) => Promise<void>
    ): Promise<void> => {
      startReconnectTimeout()
      return streamPromise(retryCount)
    }

    /* eslint max-statements: off */
    const streamPromise = async (previousRetryCount = 1): Promise<void> => {
      let retryCount = previousRetryCount
      streamStarted = new Date(new Date().toUTCString())

      const handleError = (stream: Readable) => {
        return async (err) => {
          this.destroyStream(stream)
          if (err.message === 'ESOCKETTIMEDOUT') {
            /* Represents our client timing out after successful connection, but seeing no data */
            this.logger.debug(key, 'stream read timed out!  Reconnecting...')
            endReconnectTimeout()
            reconnect(1, streamPromise)
          } else {
            /* Represents unexpected errors */
            this.logger.error(
              key,
              'stream encountered an error!  Reconnecting...',
              {
                error: {
                  message: err.message,
                  name: err.name
                }
              }
            )
            await this.sleep(delayBetweenRetries)
            reconnect(retryCount + 1, streamPromise)
          }
        }
      }

      const handleEnd = (stream: Readable) => {
        /* Represents kubernetes closing the stream */
        return () => {
          this.logger.debug(key, 'stream was closed.  Reconnecting...')
          this.destroyStream(stream)
          endReconnectTimeout()
          reconnect(1, streamPromise)
        }
      }

      let stream: Readable | undefined
      try {
        const watchOptions: IWatchOptions = {
          timeout: this.watchTimeout,
          qs: {}
        }

        if (lastResourceVersion) {
          watchOptions.qs.resourceVersion = lastResourceVersion
        }
        this.logger.debug(
          key,
          `stream starting (retry ${retryCount}, resourceVersion: ${lastResourceVersion}.  Current active streams: ${this.streams.length}`
        )
        stream = (await watch.getObjectStream(watchOptions)) as Readable
        this.streams.push(stream)
        stream.on('data', () => {
          endReconnectTimeout()
          retryCount = 1
        })
        stream.on('data', handleEvent)
        stream.on('error', handleError(stream))
        stream.on('end', handleEnd(stream))
      } catch (ex) {
        if (ex) {
          this.logger.error(key, 'error setting up watch', ex)
        }
        await this.sleep(delayBetweenRetries)
        /* Represents unexpected errors in the stream */
        if (stream) {
          this.destroyStream(stream)
        }
        reconnect(retryCount + 1, streamPromise)
      }
    }

    this.streamsToStart.push(streamPromise)
  }

  private async waitFor<T extends Models.IBaseResource>(
    apiVersion: T['apiVersion'],
    kind: T['kind'],
    namespace: string,
    name: string,
    condition: (resource: T & Models.IExistingResource) => boolean,
    maxTime = 10000
  ): Promise<void> {
    const start = new Date()
    const isPresentAndConditionPasses = (resource) => {
      return resource ? condition(resource) : false
    }

    let resource = await this.get<T>(apiVersion, kind, namespace, name)
    /* eslint no-await-in-loop: off */
    while (!isPresentAndConditionPasses(resource)) {
      if (new Date().valueOf() - start.valueOf() > maxTime) {
        throw new Error('Timeout exceeded')
      }
      if (!resource) {
        throw new Error(
          `Failed to find a ${kind} named ${name} in ${namespace}`
        )
      }
      await this.sleep(1000)
      resource = await this.get(apiVersion, kind, namespace, name)
    }
  }

  private destroyStream(stream: Readable) {
    try {
      stream.removeAllListeners()
      stream.destroy()
    } catch (ex) {
      this.logger.warn('Failed to destroy stream during cleanup', ex.message)
    } finally {
      this.streams = this.streams.filter((arrayItem) => arrayItem !== stream)
    }
  }

  public async waitForPodPhase(
    namespace: string,
    name: string,
    phase: PodPhase = PodPhase.Running,
    maxTime = 10000
  ): Promise<void> {
    const condition = (pod: Models.Core.IPod) => {
      if (pod?.status?.phase) {
        return PodPhase[pod.status.phase] === phase
      }
      return false
    }
    return this.waitFor<Models.Core.IPod>(
      'v1',
      'Pod',
      namespace,
      name,
      condition,
      maxTime
    )
  }

  public async waitForRollout<T extends Models.Core.IDeployment>(
    apiVersion: T['apiVersion'],
    kind: T['kind'],
    namespace: string,
    name: string,
    maxTime = 10000
  ): Promise<void> {
    const assertion = (resource: T) => {
      const progressingStatus = resource.status?.conditions?.find(
        (condition) => condition.type === 'Progressing'
      )
      const isProgressing =
        progressingStatus &&
        progressingStatus.status === 'True' &&
        progressingStatus.reason === 'NewReplicaSetAvailable'
      const isUpdated =
        resource.status?.updatedReplicas === resource.spec.replicas
      const hasSameReplicas =
        resource.status?.replicas === resource.spec.replicas
      return (isProgressing && isUpdated && hasSameReplicas) || false
    }
    return this.waitFor<T>(
      apiVersion,
      kind,
      namespace,
      name,
      assertion,
      maxTime
    )
  }

  public async waitForServiceLoadBalancerIp(
    namespace: string,
    name: string,
    maxTime = 60000
  ): Promise<void> {
    const condition = (service: Models.Core.IService) => {
      if (service.spec.type !== 'LoadBalancer') {
        return true
      }
      return (service.status?.loadBalancer?.ingress?.length || 0) > 0
    }
    return this.waitFor<Models.Core.IService>(
      'v1',
      'Service',
      namespace,
      name,
      condition,
      maxTime
    )
  }

  public async exec(
    namespace: string,
    name: string,
    container: string,
    command: string[]
  ): Promise<IExecResult> {
    try {
      const api = await this.getApi<Models.Core.IPod>(
        'v1',
        'Pod',
        namespace,
        name
      )
      const res = await api.exec.post({
        qs: {
          command,
          container,
          stdout: true,
          stderr: true
        }
      })
      const isEmpty = (item: any) => {
        return typeof item === 'undefined' || item === 'null' || item === ''
      }

      const filterByType = (type: string) => {
        return res.messages
          .filter((item) => item.channel === type)
          .map((item) => item.message)
          .filter((item) => !isEmpty(item))
          .join('\n')
      }
      const stdout = filterByType('stdout')
      const stderr = filterByType('stderr')
      const error = filterByType('error')
      const result = {
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        error,
        code: 0
      }

      const codeMatch = error.match(
        /command terminated with non-zero exit code: Error executing in Docker Container: (\d+)/
      )
      if (codeMatch) {
        result.code = parseInt(codeMatch[1], 10)
      }
      return result
    } catch (ex) {
      this.logger.error('Error executing command on kubernetes', ex)
      throw ex
    }
  }

  public async delete<T extends Models.IBaseResource>(
    apiVersion: T['apiVersion'],
    kind: T['kind'],
    namespace: string,
    name: string
  ): Promise<void> {
    try {
      const api = await this.getApi<T>(apiVersion, kind, namespace, name)
      await api.delete()
    } catch (ex) {
      if (ex.code !== 200) {
        this.logger.error('Error deleting item from kubernetes', ex)
        throw ex
      }
    }
  }

  public async get<T extends Models.IBaseResource>(
    apiVersion: T['apiVersion'],
    kind: T['kind'],
    namespace: string,
    name: string
  ): Promise<(T & Models.IExistingResource) | null> {
    try {
      const api = await this.getApi<T>(apiVersion, kind, namespace, name)
      const result = await api.get()
      return result.body
    } catch (ex) {
      if (ex.code !== 404) {
        this.logger.error('Error getting item from kubernetes', ex)
        throw new Error(ex)
      }
      return null
    }
  }

  public async select<T extends Models.IBaseResource>(
    apiVersion: T['apiVersion'],
    kind: T['kind'],
    namespace?: string,
    labelSelector?: string
  ): Promise<(T & Models.IExistingResource)[]> {
    const api = await this.getApi<T>(apiVersion, kind, namespace)
    const result = labelSelector
      ? await api.get({
          qs: {
            labelSelector
          }
        })
      : await api.get()

    if (result.statusCode !== 200) {
      throw new Error(
        `Non-200 status code returned from Kubernetes API (${result.statusCode})`
      )
    }
    return result.body.items
  }

  public async create<T extends Models.IBaseResource>(
    manifest: T & Models.INewResource
  ): Promise<void> {
    const kindHandler = await this.getApi<T>(
      manifest.apiVersion,
      manifest.kind,
      manifest.metadata.namespace
    )
    return kindHandler.post({ body: manifest })
  }

  public async addStatusCondition<T extends Models.IBaseResource>(
    apiVersion: T['apiVersion'],
    kind: T['kind'],
    namespace: string,
    name: string,
    type: string,
    status: string
  ): Promise<void> {
    const patch = [
      {
        op: 'add',
        path: '/status/conditions/-',
        value: { type, status }
      }
    ]
    return this.patch<T>(
      apiVersion,
      kind,
      namespace,
      name,
      PatchType.JsonPatch,
      patch
    )
  }

  public async patch<T extends Models.IBaseResource>(
    apiVersion: T['apiVersion'],
    kind: T['kind'],
    namespace: string,
    name: string,
    patchType: PatchType,
    patch: any
  ): Promise<void> {
    const patchTypeMappings = {
      0: 'application/merge-patch+json',
      1: 'application/json-patch+json'
    }
    const contentType = patchTypeMappings[patchType]

    if (!contentType) {
      throw new Error(
        `Unable to match patch ${PatchType[patchType]} to a content type`
      )
    }

    const patchMutated: any = {
      headers: {
        accept: 'application/json',
        'content-type': contentType
      },
      body: patch
    }

    // If this is a JSON patch to add a status condition, then mutate the url
    if (
      patchType === PatchType.JsonPatch &&
      patch[0].op === 'add' &&
      patch[0].path === '/status/conditions/-'
    ) {
      let plural = kind.toLowerCase()
      if (plural.slice(-1) !== 's') {
        plural += 's'
      }

      const date = new Date().toISOString().split('.')[0]
      patch[0].value.lastTransitionTime = `${date}.000000Z`

      const pathname = `/api/v1/namespaces/${namespace}/${plural}/${name}/status`
      patchMutated.pathname = pathname
    }

    const api = await this.getApi<T>(apiVersion, kind, namespace, name)
    const result = await api.patch(patchMutated)

    if (result.statusCode !== 200) {
      throw new Error(
        `Non-200 status code returned from Kubernetes API (${result.statusCode})`
      )
    }
  }

  public async watch<T extends Models.IBaseResource>(
    apiVersion: T['apiVersion'],
    kind: T['kind'],
    handler: ResourceCallback<T & Models.IExistingResource>,
    eventTypes: KubernetesEventType[] = [KubernetesEventType.ALL],
    namespace?: string | null
  ) {
    await this.init()
    const wrappedHandler: EventCallback<T> = (
      event: IKubernetesWatchEvent<T & Models.IExistingResource>
    ) => {
      const eventType: KubernetesEventType = KubernetesEventType[event.type]
      if (
        eventTypes.indexOf(eventType) > -1 ||
        eventTypes.indexOf(KubernetesEventType.ALL) > -1
      ) {
        handler(event.object, eventType)
      }
    }
    this.streamFor<T>(apiVersion, kind, wrappedHandler, namespace)
  }

  public async start(): Promise<void> {
    await this.init()
    this.logger.log('starting all streams')
    for (const stream of this.streamsToStart) {
      await stream()
    }
  }

  public async stop(): Promise<void> {
    this.logger.log('stopping all streams')
    for (const stream of this.streams) {
      await this.destroyStream(stream)
    }
  }

  public async rollout<
    T extends
      | Models.Core.IDeployment
      | Models.Core.IStatefulSet
      | Models.Core.IDaemonSet
  >(
    apiVersion: T['apiVersion'],
    kind: T['kind'],
    namespace: string,
    name: string
  ): Promise<void> {
    const patch = {
      spec: {
        template: {
          metadata: {
            annotations: {
              'node-at-kubernetes/restartedAt': `${new Date().getTime()}`
            }
          }
        }
      }
    }
    return this.patch(
      apiVersion,
      kind,
      namespace,
      name,
      PatchType.MergePatch,
      patch
    )
  }
}
