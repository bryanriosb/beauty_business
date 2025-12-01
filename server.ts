import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { Server as SocketIOServer } from 'socket.io'
import { setupSocketHandlers } from './lib/socket/handlers'

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.HOSTNAME || 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({
  dev,
  hostname,
  port,
  quiet: dev,
})
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true)
    handle(req, res, parsedUrl)
  })

  const io = new SocketIOServer(httpServer, {
    path: '/api/socket',
    addTrailingSlash: false,
    cors: {
      origin: dev ? '*' : process.env.NEXT_PUBLIC_APP_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  })

  setupSocketHandlers(io)

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`)
    console.log(`> Socket.io server running on /api/socket`)
  })
}).catch((err) => {
  console.error('Error starting server:', err)
  process.exit(1)
})
