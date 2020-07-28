'use strict'
require('grunt')
require('mocha')

const config = {
  targets: {
    test: ['test/**/*.test.ts'],
    ts: ['lib/**/*.ts', 'test/**/*.ts']
  },
  timeout: 10000,
  require: ['ts-node/register', 'tsconfig-paths/register', 'should']
}
config.targets.all = config.targets.test.concat(config.targets.ts)

const tsConfig = {
  default: {
    options: {
      fast: 'always',
      verbose: true
    },
    tsconfig: './tsconfig.json'
  }
}

const mochaConfig = {
  unit: {
    options: {
      reporter: 'spec',
      timeout: config.timeout,
      require: config.require
    },
    src: config.targets.test
  }
}

const eslintConfig = {
  options: {
    configFile: '.eslintrc.js',
    fix: true
  },
  target: config.targets.ts
}

const execConfig = {
  clean: 'rm -rf ./built && rm -rf .tscache',
  start: './node_modules/.bin/ts-node index.ts'
}

const copyConfig = {
  config: {
    expand: true,
    cwd: '.',
    src: 'config.yml',
    dest: 'built/'
  },
  public: {
    expand: true,
    cwd: '.',
    src: 'public/**/*',
    dest: 'built/'
  }
}

module.exports = function (grunt) {
  grunt.initConfig({
    eslint: eslintConfig,
    ts: tsConfig,
    mochaTest: mochaConfig,
    exec: execConfig,
    copy: copyConfig,
    watch: {
      files: config.targets.all,
      tasks: ['default']
    },
    env: {
      default: {
        LOG_LEVEL: 'none'
      }
    }
  })

  grunt.loadNpmTasks('grunt-mocha-test')
  grunt.loadNpmTasks('grunt-contrib-watch')
  grunt.loadNpmTasks('grunt-env')
  grunt.loadNpmTasks('grunt-ts')
  grunt.loadNpmTasks('grunt-exec')
  grunt.loadNpmTasks('grunt-contrib-copy')
  grunt.loadNpmTasks('grunt-eslint')

  // Default task.
  grunt.registerTask('lint', ['eslint'])
  grunt.registerTask('test', ['env:default', 'mochaTest:unit'])
  grunt.registerTask('build', ['exec:clean', 'ts', 'copy'])
  grunt.registerTask('default', ['lint', 'test'])
}
