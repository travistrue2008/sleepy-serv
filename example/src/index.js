import { createServer } from 'sleepy-serv'

const PORT = 3000

createServer(PORT, import.meta.dirname, {
  mountPath: '/api',
  middleware: [
    _req => console.info('root-level middleware'),
  ],
  onClose: () => console.info('closing down...'),
})
