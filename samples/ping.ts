import * as path from 'path'
import * as tsConfigPaths from 'tsconfig-paths/lib'
const baseUrl = path.join(__dirname, '../')

tsConfigPaths.register({
  baseUrl,
  paths: {}
})

import UDPServer from 'lib/udp/server'
import UDPClient from 'lib/udp/client'
import config from 'lib/config'
const server = new UDPServer(config)

server.start()

const client = new UDPClient()
;(async () => {
  console.log(await client.ping('127.0.0.1', 8081, 1, 20))
})()
