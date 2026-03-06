import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
process.chdir(__dirname)

const server = await createServer({
  configFile: './vite.config.ts',
  server: { host: '127.0.0.1', port: 3200 },
})
await server.listen()
server.printUrls()
