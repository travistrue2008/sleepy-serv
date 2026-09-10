import { createApp } from 'sleepy-serv'

const app = createApp(0, {
  ws: {
    onClose: (clientId, reason) => {
      console.log(`CLOSE:${clientId}:${reason}`)
    },
  },
})

const admin = Bun.serve({
  port: 0,
  routes: {
    '/app-trigger-drop-default': {
      POST: async (req) => {
        const body = await req.json() as { clientId: string }

        app.ws.drop(id => id === body.clientId)

        return new Response('', { status: 204 })
      },
    },
    '/app-trigger-drop-custom': {
      POST: async (req) => {
        const body = await req.json() as { clientId: string }

        app.ws.drop(id => id === body.clientId, 3999, 'player_kicked')

        return new Response('', { status: 204 })
      },
    },
  },
  fetch () {
    return new Response('Not found', { status: 404 })
  },
})

console.log(`ADMIN_PORT:${admin.port}`)
