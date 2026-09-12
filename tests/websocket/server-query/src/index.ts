import { createApp } from 'sleepy-serv'

type AppData = {
  userId: string,
}

type ConnectionData = {
  app: {
    userId: string
  }
}

const app = createApp(0, { ws: true })

const admin = Bun.serve({
  port: 0,
  routes: {
    '/app-trigger-query': {
      GET: (req) => {
        const url = new URL(req.url)
        const userId = url.searchParams.get('userId')

        const entries = app.ws.query((_clientId, data) => {
          const connectionData = data as ConnectionData

          return connectionData.app.userId !== userId
        })

        return Response.json({ count: entries.length })
      },
    },
  },
  fetch () {
    return new Response('Not found', { status: 404 })
  },
})

console.log(`ADMIN_PORT:${admin.port}`)
