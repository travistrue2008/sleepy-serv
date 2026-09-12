import { createApp } from 'sleepy-serv'

const MOUNT_PATH = '/test-mount-path'

createApp(0, {
  ws: true,
  mountPath: MOUNT_PATH,
})

