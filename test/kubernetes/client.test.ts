import * as should from 'should'
import Kubernetes, {
  IKubernetes,
  IKubernetesWatchEvent,
  KubernetesEventType,
  IGodaddyClient,
  IGodaddyWatch
} from '../../lib/kubernetes/client'
import { Models } from '../../lib/kubernetes/models'
import * as td from 'testdouble'
import TestHelpers from '../helpers'
import { EventEmitter } from 'events'
import { Readable } from 'stream'

/* eslint no-invalid-this: off */
describe('Really complicated watch logic', () => {
  let client: IKubernetes
  let godaddy: IGodaddyClient
  let watch: IGodaddyWatch

  beforeEach(() => {
    godaddy = td.object<IGodaddyClient>()
    client = new Kubernetes({
      client: godaddy
    })

    watch = td.object<IGodaddyWatch>()
    godaddy.api = {
      v1: {
        watch: {
          node: watch
        }
      }
    }
  })

  it('should have a timeout of 60s', (done) => {
    td.when(watch.getObjectStream(td.matchers.anything())).thenDo((options) => {
      should(options.timeout).eql(60000)
      done()
      return td.object<Readable>()
    })
    client.watch<Models.Core.INode>('v1', 'Node', () => {})
    client.start()
  })

  it('should initially set up a watch, with no resourceVersion', (done) => {
    td.when(watch.getObjectStream(td.matchers.anything())).thenDo((options) => {
      should(options.qs).eql({})
      done()
      return td.object<Readable>()
    })
    client.watch<Models.Core.INode>('v1', 'Node', () => {})
    client.start()
  })

  it('if we only see replay events, should resume from unset', (done) => {
    const readable = td.object<Readable>()
    const emitter = new EventEmitter()

    let counter = 0
    td.when(watch.getObjectStream({ timeout: 60000, qs: {} })).thenDo(() => {
      counter += 1
      if (counter === 2) {
        done()
      }
      return readable
    })

    const handleNodeEvent = () => {}
    client.watch<Models.Core.INode>(
      'v1',
      'Node',
      handleNodeEvent,
      [KubernetesEventType.ALL],
      null
    )
    td.when(readable.on(td.matchers.anything(), td.matchers.anything())).thenDo(
      (event, handler) => {
        emitter.on(event, handler)
      }
    )
    ;(async () => {
      await client.start()
      const incrementedModel: IKubernetesWatchEvent<Models.IExistingResource> = TestHelpers.loadSample(
        'node'
      )
      incrementedModel.object.metadata.resourceVersion = '226835920'
      incrementedModel.type = 'ADDED'
      emitter.emit('data', incrementedModel)
      emitter.emit('end')
    })()
  })

  it('if we see both replay and real events, should resume from the last real resourceVersion we saw', (done) => {
    const readable = td.object<Readable>()
    const emitter = new EventEmitter()
    const model: IKubernetesWatchEvent<Models.IExistingResource> = TestHelpers.loadSample(
      'node'
    )

    td.when(watch.getObjectStream({ timeout: 60000, qs: {} })).thenDo(() => {
      return readable
    })

    td.when(
      watch.getObjectStream({
        timeout: 60000,
        qs: { resourceVersion: '226835919' }
      })
    ).thenDo(() => {
      done()
      return readable
    })

    const handleNodeEvent = () => {}
    client.watch<Models.Core.INode>('v1', 'Node', handleNodeEvent)
    td.when(readable.on(td.matchers.anything(), td.matchers.anything())).thenDo(
      (event, handler) => {
        emitter.on(event, handler)
      }
    )
    ;(async () => {
      await client.start()

      const syntheticAddedEvent: IKubernetesWatchEvent<Models.IExistingResource> = TestHelpers.loadSample(
        'node'
      )
      syntheticAddedEvent.object.metadata.resourceVersion = '226835936'
      syntheticAddedEvent.type = 'ADDED'
      emitter.emit('data', syntheticAddedEvent)
      emitter.emit('data', model)
      emitter.emit('end')
    })()
  })

  it('if the last version we saw is gone, we should resume from unset', (done) => {
    const readable = td.object<Readable>()
    const emitter = new EventEmitter()
    const model: IKubernetesWatchEvent<Models.IExistingResource> = TestHelpers.loadSample(
      'node'
    )

    let counter = 0
    td.when(watch.getObjectStream({ timeout: 60000, qs: {} })).thenDo(() => {
      counter += 1
      if (counter === 2) {
        td.verify(watch.getObjectStream(td.matchers.anything()), { times: 3 })
        done()
      }
      return readable
    })

    td.when(
      watch.getObjectStream({
        timeout: 60000,
        qs: { resourceVersion: '226835919' }
      })
    ).thenDo(() => {
      emitter.emit('data', {
        type: 'ERROR',
        object: {
          metadata: {},
          code: 410
        }
      })
      emitter.emit('end')
      return readable
    })

    const handleNodeEvent = () => {}
    client.watch<Models.Core.INode>('v1', 'Node', handleNodeEvent)
    td.when(readable.on(td.matchers.anything(), td.matchers.anything())).thenDo(
      (event, handler) => {
        emitter.on(event, handler)
      }
    )
    ;(async () => {
      await client.start()
      emitter.emit('data', model)
      emitter.emit('end')
    })()
  })
})
