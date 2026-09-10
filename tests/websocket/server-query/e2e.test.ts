import { test, expect } from 'bun:test'
import { Fmt, createClient, createServer, wait, waitFor } from '../../helpers'

import {
  createWsClients,
  closeWsClients,
  getAdminPort,
} from '../../helpers'

test('when triggered from handler', async () => {
  const server = await createServer(import.meta.dirname)
  const wsClients = await createWsClients(server)
  const reqClient = createClient(server)

  const result = await reqClient.get('/handler-trigger-query', Fmt.Json, {
    query: {
      userId: 'user-2',
    },
  })

  await closeWsClients(wsClients)
  await server.kill()

  expect(result.body).toStrictEqual({ count: 2 })
})

test('when triggered from middleware', async () => {
  const server = await createServer(import.meta.dirname)
  const wsClients = await createWsClients(server)
  const reqClient = createClient(server)

  const result = await reqClient.get('/middleware-trigger-query', Fmt.Json, {
    query: {
      userId: 'user-2',
    },
  })

  await closeWsClients(wsClients)
  await server.kill()

  expect(result.body).toStrictEqual({ count: 2 })
})

test('when triggered from app', async () => {
  const server = await createServer(import.meta.dirname)
  const adminPort = await getAdminPort(server)
  const wsClients = await createWsClients(server)
  const reqClient = createClient({ port: adminPort })

  const result = await reqClient.get('/app-trigger-query', Fmt.Json, {
    query: {
      userId: 'user-2',
    },
  })

  await closeWsClients(wsClients)
  await server.kill()

  expect(result.body).toStrictEqual({ count: 2 })
})
