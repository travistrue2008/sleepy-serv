import { createApp } from 'sleepy-serv'

type AppData = {
  userId: string,
}

type ConnectionData = {
  userId: string
}

const app = createApp<ConnectionData>(0, { ws: true })

const admin = Bun.serve({
  port: 0,
  routes: {
    '/app-trigger-send': {
      POST: async (req) => {
        const body = await req.json() as AppData

        const message = {
          message: `Hello from ${body.userId}`,
        }

        app.ws.send('player_joined', message, (session) => {
          return session.data.userId !== body.userId
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
