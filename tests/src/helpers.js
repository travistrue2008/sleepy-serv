import SleepySocketClient from 'sleepy-socket'
import { createApp } from 'sleepy-serv'

/*
  Boot a real sleepy-serv server for a fixture directory and connect a real
  sleepy-socket client to it. Port 0 lets Bun pick a free ephemeral port, so
  parallel test files never collide; the client dials the actual bound port.

  opts.client is forwarded to SleepySocketClient.connect (queue, secure,
  timeout); all other opts pass through to createApp.
 */

/*
  Raw handshake helpers for driving the two-step reconnect flow directly over
  HTTP + WebSocket, without the SleepySocketClient's private internals.
  postSession mints a fresh identity; putSession reclaims an existing one with
  a bearer token; openRawSocket redeems a ticket and resolves on the welcome
  frame.
 */

export async function postSession (port) {
  const response = await fetch(`http://localhost:${port}/ws`, {
    method: 'POST',
  })

  return {
    status: response.status,
    body: response.ok ? await response.json() : null,
  }
}

export async function putSession (port, clientId, token) {
  const response = await fetch(`http://localhost:${port}/ws/${clientId}`, {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${token}`,
    },
  })

  return {
    status: response.status,
    body: response.ok ? await response.json() : null,
  }
}

export function openRawSocket (port, ticket) {
  return new Promise((resolve, reject) => {
    const url = `ws://localhost:${port}/ws?ticket=${ticket}`
    const socket = new WebSocket(url)

    socket.addEventListener('message', event => {
      resolve({
        socket,
        welcome: JSON.parse(event.data),
      })
    }, { once: true })

    socket.addEventListener('error', reject)
  })
}

export async function createServer (dirname, opts = {}) {
  const app = await createApp(0, dirname, opts)

  return app.server
}

export async function createSocketClient (port, opts = {}) {
  const client = await SleepySocketClient.connect('localhost', port, opts)

  return client
}

export async function boot (dirname, opts = {}) {
  const serverOpts = opts.server
  const clientOpts = opts.client
  const app = await createApp(0, dirname, serverOpts)

  const client = await SleepySocketClient.connect(
    'localhost',
    app.server.port,
    clientOpts,
  )

  return {
    port: app.server.port,
    client,
    app,
    async shutdown () {
      await client.close()
      await app.server.stop(true)
    },
  }
}
