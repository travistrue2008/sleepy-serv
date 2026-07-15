import SleepySocketClient from 'sleepy-socket'
import { createApp } from 'sleepy-serv'

/*
  Boot a real sleepy-serv server for a fixture directory and connect a real
  sleepy-socket client to it. Port 0 lets Bun pick a free ephemeral port, so
  parallel test files never collide; the client dials the actual bound port.

  opts.client is forwarded to SleepySocketClient.connect (queue, secure,
  timeout); all other opts pass through to createApp.
 */

export async function postSession (port, headers = {}) {
  const response = await fetch(`http://localhost:${port}/ws`, {
    method: 'POST',
    headers,
  })

  return {
    status: response.status,
    body: response.ok ? await response.json() : null,
  }
}

export async function putSession (port, clientId, token, headers = {}) {
  const response = await fetch(`http://localhost:${port}/ws/${clientId}`, {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${token}`,
      ...headers,
    },
  })

  return {
    status: response.status,
    body: response.ok ? await response.json() : null,
  }
}

/*
  Poll a predicate on real timers until it is truthy or the timeout elapses.
  The root E2E suite runs on real timers (see test-setup.js), so there is no
  fake clock to advance; this awaits genuine wall-clock events like a reconnect
  swapping in a new socket or a reaper closing one.
 */

export function waitFor (predicate, opts = {}) {
  const timeout = opts.timeout ?? 1000
  const interval = opts.interval ?? 10

  return new Promise((resolve, reject) => {
    const start = Date.now()

    const check = () => {
      if (predicate()) {
        resolve()

        return
      }

      if (Date.now() - start >= timeout) {
        reject(new Error('waitFor timed out.'))

        return
      }

      setTimeout(check, interval)
    }

    check()
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
