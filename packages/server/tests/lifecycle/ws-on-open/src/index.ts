import { createApp } from 'sleepy-serv'

createApp(0, {
  ws: {
    onOpen: (clientId) => {
      console.log(`OPENED:${clientId}`)
    },
  },
})
