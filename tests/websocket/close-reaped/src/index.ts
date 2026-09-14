import { createApp } from 'sleepy-serv'

createApp(0, {
  ws: {
    heartbeatInterval: 200_000,
    dropThreshold: 100,
    onClose: (clientId, signal) => {
      console.log(`CLOSE:${clientId}:${signal.reason}`)
    },
  },
})

