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
    '/app-trigger-query': {
      GET: (req) => {
        const url = new URL(req.url)
        const userId = url.searchParams.get('userId')

        const entries = app.ws.query((session) => {
          return session.data.userId !== userId
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
