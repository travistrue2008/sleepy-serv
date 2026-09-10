import { createApp } from 'sleepy-serv'

createApp(0, {
  ws: {
    onClose: (clientId, reason) => {
      console.log(`CLOSE:${clientId}:${reason}`)
    },
  },
})

