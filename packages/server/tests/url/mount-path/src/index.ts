import { createApp } from 'sleepy-serv'

createApp(0, {
  ws: true,
  mountPath: '/test-mount-path',
})
