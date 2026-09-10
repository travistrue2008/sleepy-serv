import { createApp } from 'sleepy-serv'

createApp(0, {
  ws: {
    heartbeatInterval: 200_000,
    dropThreshold: 100,
    onClose: (clientId, reason) => {
      console.log(`CLOSE:${clientId}:${reason}`)
    },
  },
})

