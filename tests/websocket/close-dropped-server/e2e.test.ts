import SleepySocketClient from 'sleepy-socket'
import { CloseCode } from 'sleepy-serv'
import { describe, mock, test, expect } from 'bun:test'

import {
  Fmt,
  wait,
  waitFor,
  createServer,
  createClient,
  getAdminPort,
  waitForCloseCount,
} from '../../helpers'

const OPTS_RECONNECT = {
  reconnect: {
    minDelay: 20,
    random: () => 0,
  },
}

describe('handler', () => {
  test('when NO custom reason provided AND reconnect enabled', async () => {
    const server = await createServer(import.meta.dirname)
    const reqClient = createClient(server)
    const handlers = [mock(), mock(), mock()]

    const clients = await Promise.all(
      handlers.map(() => SleepySocketClient.open(
        'localhost',
        server.port,
        OPTS_RECONNECT,
      )),
    )

    clients.forEach((client, index) => {
      client.on('close', handlers[index])
    })

    await reqClient.post(`/handler-trigger-drop-default`, Fmt.Text, {
      body: JSON.stringify({
        clientId: clients[1].id,
      }),
    })

    await waitFor(() => !clients[1].isConnected)
    await waitForCloseCount(server, 1)
    await wait(100)

    expect(clients[0].isConnected).toBe(true)
    expect(clients[2].isConnected).toBe(true)
    expect(handlers[0]).not.toHaveBeenCalled()
    expect(handlers[1]).toHaveBeenCalledOnce()
    expect(handlers[1]).toHaveBeenCalledWith({ code: CloseCode.Ok })
    expect(handlers[2]).not.toHaveBeenCalled()

    await clients[0].close()
    await clients[2].close()
    await waitForCloseCount(server, 3)
    await server.kill()

    const closeLines = server.output.filter(l => l.startsWith('CLOSE:'))

    expect(closeLines).toStrictEqual([
      `CLOSE:${clients[1].id}:ok`, /* CHECK: reason = "dropped"? */
      `CLOSE:${clients[0].id}:ok`,
      `CLOSE:${clients[2].id}:ok`,
    ])
  })

  test('when NO custom reason provided AND reconnect disabled', async () => {
    const server = await createServer(import.meta.dirname)
    const reqClient = createClient(server)
    const handlers = [mock(), mock(), mock()]

    const clients = await Promise.all(
      handlers.map(() => SleepySocketClient.open(
        'localhost',
        server.port,
        { reconnect: false },
      )),
    )

    clients.forEach((client, index) => {
      client.on('close', handlers[index])
    })

    await reqClient.post(`/handler-trigger-drop-default`, Fmt.Text, {
      body: JSON.stringify({
        clientId: clients[1].id,
      }),
    })

    await waitFor(() => !clients[1].isConnected)
    await waitForCloseCount(server, 1)

    expect(clients[0].isConnected).toBe(true)
    expect(clients[2].isConnected).toBe(true)
    expect(handlers[0]).not.toHaveBeenCalled()
    expect(handlers[1]).toHaveBeenCalledOnce()
    expect(handlers[1]).toHaveBeenCalledWith({ code: CloseCode.Ok })
    expect(handlers[2]).not.toHaveBeenCalled()

    await clients[0].close()
    await clients[2].close()
    await waitForCloseCount(server, 3)
    await server.kill()

    const closeLines = server.output.filter(l => l.startsWith('CLOSE:'))

    expect(closeLines).toStrictEqual([
      `CLOSE:${clients[1].id}:ok`, /* CHECK: reason = "dropped"? */
      `CLOSE:${clients[0].id}:ok`,
      `CLOSE:${clients[2].id}:ok`,
    ])
  })

  test('when CUSTOM reason provided AND reconnect enabled', async () => {
    const server = await createServer(import.meta.dirname)
    const reqClient = createClient(server)
    const handlers = [mock(), mock(), mock()]

    const clients = await Promise.all(
      handlers.map(() => SleepySocketClient.open(
        'localhost',
        server.port,
        OPTS_RECONNECT,
      )),
    )

    clients.forEach((client, index) => {
      client.on('close', handlers[index])
    })

    await reqClient.post(`/handler-trigger-drop-custom`, Fmt.Text, {
      body: JSON.stringify({
        clientId: clients[1].id,
      }),
    })

    await waitFor(() => !clients[1].isConnected)
    await waitForCloseCount(server, 1)

    expect(clients[0].isConnected).toBe(true)
    expect(clients[2].isConnected).toBe(true)
    expect(handlers[0]).not.toHaveBeenCalled()
    expect(handlers[1]).toHaveBeenCalledOnce()
    expect(handlers[1]).toHaveBeenCalledWith({ code: 3999 })
    expect(handlers[2]).not.toHaveBeenCalled()

    await clients[0].close()
    await clients[2].close()
    await waitForCloseCount(server, 3)
    await server.kill()

    const closeLines = server.output.filter(l => l.startsWith('CLOSE:'))

    expect(closeLines).toStrictEqual([
      `CLOSE:${clients[1].id}:dropped`, /* CHECK: reason = "player_kicked"? */
      `CLOSE:${clients[0].id}:ok`,
      `CLOSE:${clients[2].id}:ok`,
    ])
  })

  test('when CUSTOM reason provided AND reconnect disabled', async () => {
    const server = await createServer(import.meta.dirname)
    const reqClient = createClient(server)
    const handlers = [mock(), mock(), mock()]

    const clients = await Promise.all(
      handlers.map(() => SleepySocketClient.open(
        'localhost',
        server.port,
        { reconnect: false },
      )),
    )

    clients.forEach((client, index) => {
      client.on('close', handlers[index])
    })

    await reqClient.post(`/handler-trigger-drop-custom`, Fmt.Text, {
      body: JSON.stringify({
        clientId: clients[1].id,
      }),
    })

    await waitFor(() => !clients[1].isConnected)
    await waitForCloseCount(server, 1)

    expect(clients[0].isConnected).toBe(true)
    expect(clients[2].isConnected).toBe(true)
    expect(handlers[0]).not.toHaveBeenCalled()
    expect(handlers[1]).toHaveBeenCalledOnce()
    expect(handlers[1]).toHaveBeenCalledWith({ code: 3999 })
    expect(handlers[2]).not.toHaveBeenCalled()

    await clients[0].close()
    await clients[2].close()
    await waitForCloseCount(server, 3)
    await server.kill()

    const closeLines = server.output.filter(l => l.startsWith('CLOSE:'))

    expect(closeLines).toStrictEqual([
      `CLOSE:${clients[1].id}:dropped`, /* CHECK: reason = "player_kicked"? */
      `CLOSE:${clients[0].id}:ok`,
      `CLOSE:${clients[2].id}:ok`,
    ])
  })
})

describe('middleware', () => {
  test('when NO custom reason provided AND reconnect enabled', async () => {
    const server = await createServer(import.meta.dirname)
    const reqClient = createClient(server)
    const handlers = [mock(), mock(), mock()]

    const clients = await Promise.all(
      handlers.map(() => SleepySocketClient.open(
        'localhost',
        server.port,
        OPTS_RECONNECT,
      )),
    )

    clients.forEach((client, index) => {
      client.on('close', handlers[index])
    })

    await reqClient.post(`/middleware-trigger-drop-default`, Fmt.Text, {
      body: JSON.stringify({
        clientId: clients[1].id,
      }),
    })

    await waitFor(() => !clients[1].isConnected)
    await waitForCloseCount(server, 1)
    await wait(100)

    expect(clients[0].isConnected).toBe(true)
    expect(clients[2].isConnected).toBe(true)
    expect(handlers[0]).not.toHaveBeenCalled()
    expect(handlers[1]).toHaveBeenCalledOnce()
    expect(handlers[1]).toHaveBeenCalledWith({ code: CloseCode.Ok })
    expect(handlers[2]).not.toHaveBeenCalled()

    await clients[0].close()
    await clients[2].close()
    await waitForCloseCount(server, 3)
    await server.kill()

    const closeLines = server.output.filter(l => l.startsWith('CLOSE:'))

    expect(closeLines).toStrictEqual([
      `CLOSE:${clients[1].id}:ok`, /* CHECK: reason = "dropped"? */
      `CLOSE:${clients[0].id}:ok`,
      `CLOSE:${clients[2].id}:ok`,
    ])
  })

  test('when NO custom reason provided AND reconnect disabled', async () => {
    const server = await createServer(import.meta.dirname)
    const reqClient = createClient(server)
    const handlers = [mock(), mock(), mock()]

    const clients = await Promise.all(
      handlers.map(() => SleepySocketClient.open(
        'localhost',
        server.port,
        { reconnect: false },
      )),
    )

    clients.forEach((client, index) => {
      client.on('close', handlers[index])
    })

    await reqClient.post(`/middleware-trigger-drop-default`, Fmt.Text, {
      body: JSON.stringify({
        clientId: clients[1].id,
      }),
    })

    await waitFor(() => !clients[1].isConnected)
    await waitForCloseCount(server, 1)

    expect(clients[0].isConnected).toBe(true)
    expect(clients[2].isConnected).toBe(true)
    expect(handlers[0]).not.toHaveBeenCalled()
    expect(handlers[1]).toHaveBeenCalledOnce()
    expect(handlers[1]).toHaveBeenCalledWith({ code: CloseCode.Ok })
    expect(handlers[2]).not.toHaveBeenCalled()

    await clients[0].close()
    await clients[2].close()
    await waitForCloseCount(server, 3)
    await server.kill()

    const closeLines = server.output.filter(l => l.startsWith('CLOSE:'))

    expect(closeLines).toStrictEqual([
      `CLOSE:${clients[1].id}:ok`, /* CHECK: reason = "dropped"? */
      `CLOSE:${clients[0].id}:ok`,
      `CLOSE:${clients[2].id}:ok`,
    ])
  })

  test('when CUSTOM reason provided AND reconnect enabled', async () => {
    const server = await createServer(import.meta.dirname)
    const reqClient = createClient(server)
    const handlers = [mock(), mock(), mock()]

    const clients = await Promise.all(
      handlers.map(() => SleepySocketClient.open(
        'localhost',
        server.port,
        OPTS_RECONNECT,
      )),
    )

    clients.forEach((client, index) => {
      client.on('close', handlers[index])
    })

    await reqClient.post(`/middleware-trigger-drop-custom`, Fmt.Text, {
      body: JSON.stringify({
        clientId: clients[1].id,
      }),
    })

    await waitFor(() => !clients[1].isConnected)
    await waitForCloseCount(server, 1)

    expect(clients[0].isConnected).toBe(true)
    expect(clients[2].isConnected).toBe(true)
    expect(handlers[0]).not.toHaveBeenCalled()
    expect(handlers[1]).toHaveBeenCalledOnce()
    expect(handlers[1]).toHaveBeenCalledWith({ code: 3999 })
    expect(handlers[2]).not.toHaveBeenCalled()

    await clients[0].close()
    await clients[2].close()
    await waitForCloseCount(server, 3)
    await server.kill()

    const closeLines = server.output.filter(l => l.startsWith('CLOSE:'))

    expect(closeLines).toStrictEqual([
      `CLOSE:${clients[1].id}:dropped`, /* CHECK: reason = "player_kicked"? */
      `CLOSE:${clients[0].id}:ok`,
      `CLOSE:${clients[2].id}:ok`,
    ])
  })

  test('when CUSTOM reason provided AND reconnect disabled', async () => {
    const server = await createServer(import.meta.dirname)
    const reqClient = createClient(server)
    const handlers = [mock(), mock(), mock()]

    const clients = await Promise.all(
      handlers.map(() => SleepySocketClient.open(
        'localhost',
        server.port,
        { reconnect: false },
      )),
    )

    clients.forEach((client, index) => {
      client.on('close', handlers[index])
    })

    await reqClient.post(`/middleware-trigger-drop-custom`, Fmt.Text, {
      body: JSON.stringify({
        clientId: clients[1].id,
      }),
    })

    await waitFor(() => !clients[1].isConnected)
    await waitForCloseCount(server, 1)

    expect(clients[0].isConnected).toBe(true)
    expect(clients[2].isConnected).toBe(true)
    expect(handlers[0]).not.toHaveBeenCalled()
    expect(handlers[1]).toHaveBeenCalledOnce()
    expect(handlers[1]).toHaveBeenCalledWith({ code: 3999 })
    expect(handlers[2]).not.toHaveBeenCalled()

    await clients[0].close()
    await clients[2].close()
    await waitForCloseCount(server, 3)
    await server.kill()

    const closeLines = server.output.filter(l => l.startsWith('CLOSE:'))

    expect(closeLines).toStrictEqual([
      `CLOSE:${clients[1].id}:dropped`, /* CHECK: reason = "player_kicked"? */
      `CLOSE:${clients[0].id}:ok`,
      `CLOSE:${clients[2].id}:ok`,
    ])
  })
})

describe('app', () => {
  test('when NO custom reason provided AND reconnect enabled', async () => {
    const server = await createServer(import.meta.dirname)
    const adminPort = await getAdminPort(server)
    const reqClient = createClient({ port: adminPort })
    const handlers = [mock(), mock(), mock()]

    const clients = await Promise.all(
      handlers.map(() => SleepySocketClient.open(
        'localhost',
        server.port,
        OPTS_RECONNECT,
      )),
    )

    clients.forEach((client, index) => {
      client.on('close', handlers[index])
    })

    await reqClient.post(`/app-trigger-drop-default`, Fmt.Text, {
      body: JSON.stringify({
        clientId: clients[1].id,
      }),
    })

    await waitFor(() => !clients[1].isConnected)
    await waitForCloseCount(server, 1)
    await wait(100)

    expect(clients[0].isConnected).toBe(true)
    expect(clients[2].isConnected).toBe(true)
    expect(handlers[0]).not.toHaveBeenCalled()
    expect(handlers[1]).toHaveBeenCalledOnce()
    expect(handlers[1]).toHaveBeenCalledWith({ code: CloseCode.Ok })
    expect(handlers[2]).not.toHaveBeenCalled()

    await clients[0].close()
    await clients[2].close()
    await waitForCloseCount(server, 3)
    await server.kill()

    const closeLines = server.output.filter(l => l.startsWith('CLOSE:'))

    expect(closeLines).toStrictEqual([
      `CLOSE:${clients[1].id}:ok`, /* CHECK: reason = "dropped"? */
      `CLOSE:${clients[0].id}:ok`,
      `CLOSE:${clients[2].id}:ok`,
    ])
  })

  test('when NO custom reason provided AND reconnect disabled', async () => {
    const server = await createServer(import.meta.dirname)
    const adminPort = await getAdminPort(server)
    const reqClient = createClient({ port: adminPort })
    const handlers = [mock(), mock(), mock()]

    const clients = await Promise.all(
      handlers.map(() => SleepySocketClient.open(
        'localhost',
        server.port,
        { reconnect: false },
      )),
    )

    clients.forEach((client, index) => {
      client.on('close', handlers[index])
    })

    await reqClient.post(`/app-trigger-drop-default`, Fmt.Text, {
      body: JSON.stringify({
        clientId: clients[1].id,
      }),
    })

    await waitFor(() => !clients[1].isConnected)
    await waitForCloseCount(server, 1)

    expect(clients[0].isConnected).toBe(true)
    expect(clients[2].isConnected).toBe(true)
    expect(handlers[0]).not.toHaveBeenCalled()
    expect(handlers[1]).toHaveBeenCalledOnce()
    expect(handlers[1]).toHaveBeenCalledWith({ code: CloseCode.Ok })
    expect(handlers[2]).not.toHaveBeenCalled()

    await clients[0].close()
    await clients[2].close()
    await waitForCloseCount(server, 3)
    await server.kill()

    const closeLines = server.output.filter(l => l.startsWith('CLOSE:'))

    expect(closeLines).toStrictEqual([
      `CLOSE:${clients[1].id}:ok`, /* CHECK: reason = "dropped"? */
      `CLOSE:${clients[0].id}:ok`,
      `CLOSE:${clients[2].id}:ok`,
    ])
  })

  test('when CUSTOM reason provided AND reconnect enabled', async () => {
    const server = await createServer(import.meta.dirname)
    const adminPort = await getAdminPort(server)
    const reqClient = createClient({ port: adminPort })
    const handlers = [mock(), mock(), mock()]

    const clients = await Promise.all(
      handlers.map(() => SleepySocketClient.open(
        'localhost',
        server.port,
        OPTS_RECONNECT,
      )),
    )

    clients.forEach((client, index) => {
      client.on('close', handlers[index])
    })

    await reqClient.post(`/app-trigger-drop-custom`, Fmt.Text, {
      body: JSON.stringify({
        clientId: clients[1].id,
      }),
    })

    await waitFor(() => !clients[1].isConnected)
    await waitForCloseCount(server, 1)

    expect(clients[0].isConnected).toBe(true)
    expect(clients[2].isConnected).toBe(true)
    expect(handlers[0]).not.toHaveBeenCalled()
    expect(handlers[1]).toHaveBeenCalledOnce()
    expect(handlers[1]).toHaveBeenCalledWith({ code: 3999 })
    expect(handlers[2]).not.toHaveBeenCalled()

    await clients[0].close()
    await clients[2].close()
    await waitForCloseCount(server, 3)
    await server.kill()

    const closeLines = server.output.filter(l => l.startsWith('CLOSE:'))

    expect(closeLines).toStrictEqual([
      `CLOSE:${clients[1].id}:dropped`, /* CHECK: reason = "player_kicked"? */
      `CLOSE:${clients[0].id}:ok`,
      `CLOSE:${clients[2].id}:ok`,
    ])
  })

  test('when CUSTOM reason provided AND reconnect disabled', async () => {
    const server = await createServer(import.meta.dirname)
    const adminPort = await getAdminPort(server)
    const reqClient = createClient({ port: adminPort })
    const handlers = [mock(), mock(), mock()]

    const clients = await Promise.all(
      handlers.map(() => SleepySocketClient.open(
        'localhost',
        server.port,
        { reconnect: false },
      )),
    )

    clients.forEach((client, index) => {
      client.on('close', handlers[index])
    })

    await reqClient.post(`/app-trigger-drop-custom`, Fmt.Text, {
      body: JSON.stringify({
        clientId: clients[1].id,
      }),
    })

    await waitFor(() => !clients[1].isConnected)
    await waitForCloseCount(server, 1)

    expect(clients[0].isConnected).toBe(true)
    expect(clients[2].isConnected).toBe(true)
    expect(handlers[0]).not.toHaveBeenCalled()
    expect(handlers[1]).toHaveBeenCalledOnce()
    expect(handlers[1]).toHaveBeenCalledWith({ code: 3999 })
    expect(handlers[2]).not.toHaveBeenCalled()

    await clients[0].close()
    await clients[2].close()
    await waitForCloseCount(server, 3)
    await server.kill()

    const closeLines = server.output.filter(l => l.startsWith('CLOSE:'))

    expect(closeLines).toStrictEqual([
      `CLOSE:${clients[1].id}:dropped`, /* CHECK: reason = "player_kicked"? */
      `CLOSE:${clients[0].id}:ok`,
      `CLOSE:${clients[2].id}:ok`,
    ])
  })
})
