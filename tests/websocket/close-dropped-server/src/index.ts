import { createApp } from 'sleepy-serv'
import { KickedCloseSignal } from './utils'

const app = createApp(0, {
  ws: {
    onClose: (clientId, signal) => {
      console.log(`CLOSE:${clientId}:${signal.reason}`)
    },
  },
})

const admin = Bun.serve({
  port: 0,
  routes: {
    '/app-trigger-drop': {
      POST: async (req) => {
        const body = await req.json() as { clientId: string }

        app.ws.drop(KickedCloseSignal, id => id === body.clientId)

        return new Response('', { status: 204 })
      },
    },
  },
  fetch () {
    return new Response('Not found', { status: 404 })
  },
})

console.log(`ADMIN_PORT:${admin.port}`)
