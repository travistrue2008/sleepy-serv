import { createApp } from 'sleepy-serv'

type AppData = {
  userId: string,
}

type ConnectionData = {
  app: {
    userId: string
  }
}

const app = createApp(0)

const admin = Bun.serve({
  port: 0,
  routes: {
    '/app-trigger-send': {
      POST: async (req) => {
        const body = await req.json() as AppData

        const message = {
          message: `Hello from ${body.userId}`,
        }

        app.ws.send('player_joined', message, (_clientId, data) => {
          const connectionData = data as ConnectionData

          return connectionData.app.userId !== body.userId
        })

        return new Response('', { status: 204 })
      },
    },
  },
  fetch () {
    return new Response('Not found', { status: 404 })
  },
})

console.log(`ADMIN_PORT:${admin.port}`)
