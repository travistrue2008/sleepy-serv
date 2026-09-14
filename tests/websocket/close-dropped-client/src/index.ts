import { createApp } from 'sleepy-serv'

createApp(0, {
  ws: {
    onClose: (clientId, signal) => {
      console.log(`CLOSE:${clientId}:${signal.reason}`)
    },
  },
})

