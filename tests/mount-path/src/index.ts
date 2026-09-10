import { createApp } from 'sleepy-serv'

const MOUNT_PATH = '/test-mount-path'

createApp(0, {
  mountPath: MOUNT_PATH,
})

