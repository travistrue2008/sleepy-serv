import { createApp } from '../../../src'

const app = await createApp(0, import.meta.dirname)

console.log(`PORT:${app.server.port}`)
