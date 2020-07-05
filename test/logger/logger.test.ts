import Logger, { LogLevel, IConsole, ILogger } from '../../lib/logger'
import * as should from 'should'

describe('Logger', () => {
  /* eslint init-declarations: off */
  let lastMessage: any | undefined, logger: ILogger
  let messageProcessor
  before(() => {
    const mockConsole: IConsole = {
      log: (msg) => {
        messageProcessor(msg)
      }
    }
    logger = new Logger('test-logger', LogLevel.debug, mockConsole)
  })

  it('should throw an error if you use an unknown log level with the environment variable', () => {
    process.env.LOG_LEVEL = 'bacon'
    try {
      const sut = new Logger('test-logger')
      should(sut).not.be.empty()
    } catch (ex) {
      should(ex.message).eql('unknown log level: bacon')
    }
    process.env.LOG_LEVEL = 'none'
  })

  it('should accept valid log levels via the environment variable', () => {
    const sut = new Logger('test-logger', LogLevel.info)
    should(sut).not.be.empty()
  })

  describe('Logging', () => {
    before(() => {
      messageProcessor = (msg: string): void => {
        lastMessage = JSON.parse(msg)
      }
    })
    const commonTests = (level: string, message = 'testing'): void => {
      should(lastMessage.level).eql(level)
      should(lastMessage.timestamp).not.be.empty()
      should(lastMessage.module).eql('test-logger')
      should(lastMessage.message).eql(message)
    }

    it('should handle null', () => {
      logger.info(null)
      should(lastMessage.message).eql('')
    })

    it('should write debug messages', () => {
      logger.debug('testing')
      commonTests('debug')
    })

    it('if just an exception is passed, it should take the error message and put it on the message field', () => {
      logger.debug(new Error('bang'))
      should(lastMessage.message).eql('bang')
    })

    it('should write info messages', () => {
      logger.info('testing')
      commonTests('info')
    })

    it('should write log as info messages', () => {
      logger.log('testing')
      commonTests('info')
    })

    it('should write warn messages', () => {
      logger.warn('testing')
      commonTests('warn')
    })

    it('should write error messages', () => {
      logger.error('testing')
      commonTests('error')
    })

    it('should map complex objects to properties', () => {
      logger.log('testing', {
        some: 'object',
        with: 'fields'
      })
      commonTests('info')
      should(lastMessage.some).eql('object')
      should(lastMessage.with).eql('fields')
    })

    it('should map multiple strings into a single message', () => {
      logger.log(
        'testing',
        {
          some: 'object',
          with: 'fields'
        },
        'some',
        'string'
      )
      commonTests('info', 'testing some string')
    })

    it('should map error objects to properties', () => {
      logger.log('testing', new Error('boom'))
      commonTests('info')
      should(lastMessage.error.message).eql('boom')
      should(lastMessage.error.name).eql('Error')
      /* eslint no-unused-expressions: off */
      should(lastMessage.error.stack).not.be.empty
    })
  })
})
