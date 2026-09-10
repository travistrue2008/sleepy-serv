import { createApp } from 'sleepy-serv'

const app = createApp(0)

const admin = Bun.serve({
  port: 0,
  routes: {
    '/app-trigger-broadcast': {
      POST: () => {
        app.ws.broadcast('state_changed', { score: 1 })

        return new Response('', { status: 204 })
      },
    },
  },
  fetch () {
    return new Response('Not found', { status: 404 })
  },
})

console.log(`ADMIN_PORT:${admin.port}`)
