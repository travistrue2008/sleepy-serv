import { createServer } from 'sleepy-serv'

const PORT = 3000

createServer(PORT, import.meta.dirname)
