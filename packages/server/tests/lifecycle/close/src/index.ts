import { createApp } from 'sleepy-serv'

const app = createApp(0, {
  onClose: () => {
    console.log('CLOSED')
  },
})

process.on('SIGTERM', async () => {
  await app.close(true)
  process.exit(0)
})
