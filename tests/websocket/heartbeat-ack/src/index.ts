import { createApp } from 'sleepy-serv'

createApp(0, {
  ws: {
    heartbeatInterval: 100,
  },
})

