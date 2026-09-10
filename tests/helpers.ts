import path from 'path'
import SleepySocketClient from 'sleepy-socket'

import type { HttpMethod } from 'sleepy-serv'
import type { NotificationMessage, OpenOptions } from 'sleepy-socket'

const STARTUP_TIMEOUT = 5000

type HasPort = {
  port: number
}

type CloseEvent = {
  clientId: string
  code: number
}

export const Fmt = {
  Text: 'text',
  Json: 'json',
} as const

export type Fmt = typeof Fmt[keyof typeof Fmt]

export type HttpResult = {
  status: number
  body: unknown
}

export type TicketBody = {
  clientId: string
  ticket: string
  data: unknown
}

export type ServerHandle = {
  port: number
  output: string[]
  kill: () => Promise<void>
}

export type Query = Record<string, string>

export type RequestOptions = {
  mountPath?: string
  query?: Query
  headers?: Headers
  body?: Bun.BodyInit | number
}

export type RequestorMethodFn = (
  route: string,
  fmt: Fmt | null,
  opts?: RequestOptions,
) => Promise<HttpResult>

export type Requestor = {
  options: RequestorMethodFn
  head: RequestorMethodFn
  get: RequestorMethodFn
  put: RequestorMethodFn
  post: RequestorMethodFn
  patch: RequestorMethodFn
  delete: RequestorMethodFn
}

/*
  Poll a predicate on real timers until it is truthy or the timeout elapses.
  The root E2E suite runs on real timers (see test-setup.ts), so there is no
  fake clock to advance; this awaits genuine wall-clock events like a reconnect
  swapping in a new socket or a reaper closing one.
 */

export type WaitForOptions = {
  timeout?: number
  interval?: number
}

export function wait (ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export function waitFor (
  predicate: () => boolean,
  opts: WaitForOptions = {},
): Promise<void> {
  const timeout = opts.timeout ?? 1000
  const interval = opts.interval ?? 10

  return new Promise((resolve, reject) => {
    const start = Date.now()

    const check = (): void => {
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

async function deserializeBody (
  fmt: Fmt | null,
  res: Response,
): Promise<unknown> {
  if (!fmt) {
    return undefined
  }

  const body = await res[fmt]()

  return body
}

async function makeRequestMethod (
  source: HasPort,
  method: HttpMethod | 'OPTIONS',
  route: string,
  fmt: Fmt | null,
  opts: RequestOptions = {},
): Promise<HttpResult> {
  const origin = `http://localhost:${source.port}`
  const query = new URLSearchParams(opts.query ?? {}).toString()
  const mountPath = opts.mountPath ?? ''
  const pathname = path.join(mountPath, route)

  const trimmed = pathname.endsWith('/')
    ? pathname.slice(0, -1)
    : pathname

  const suffix = query ? `?${query}` : ''
  const url = `${origin}${trimmed}${suffix}`

  const body = typeof opts.body === 'number'
    ? String(opts.body)
    : opts.body

  const res = await fetch(url, {
    method,
    headers: opts.headers ?? new Headers(),
    body: body ?? undefined /* no-op for clarity */,
  })

  return {
    status: res.status,
    body: await deserializeBody(fmt, res),
  }
}

export function createClient (source: HasPort): Requestor {
  return {
    options (route: string, fmt: Fmt | null, opts: RequestOptions = {}) {
      return makeRequestMethod(source, 'OPTIONS', route, fmt, opts)
    },
    head (route: string, fmt: Fmt | null, opts: RequestOptions = {}) {
      return makeRequestMethod(source, 'HEAD', route, fmt, opts)
    },
    get (route: string, fmt: Fmt | null, opts: RequestOptions = {}) {
      return makeRequestMethod(source, 'GET', route, fmt, opts)
    },
    put (route: string, fmt: Fmt | null, opts: RequestOptions = {}) {
      return makeRequestMethod(source, 'PUT', route, fmt, opts)
    },
    post (route: string, fmt: Fmt | null, opts: RequestOptions = {}) {
      return makeRequestMethod(source, 'POST', route, fmt, opts)
    },
    patch (route: string, fmt: Fmt | null, opts: RequestOptions = {}) {
      return makeRequestMethod(source, 'PATCH', route, fmt, opts)
    },
    delete (route: string, fmt: Fmt | null, opts: RequestOptions = {}) {
      return makeRequestMethod(source, 'DELETE', route, fmt, opts)
    },
  }
}

export type WsClientOptions = Omit<OpenOptions, 'ctx'> & {
  ctx?: Record<string, unknown>
}

export async function createWsClients (
  server: ServerHandle,
  opts?: WsClientOptions,
) {
  const COUNT = 3

  return Promise.all(
    Array.from({ length: COUNT }).map(async (_item, index) => {
      return SleepySocketClient.open('localhost', server.port, {
        ...opts,
        ctx: {
          ...opts?.ctx,
          userId: `user-${index + 1}`,
        },
      })
    }),
  )
}

export function closeWsClients (clients: SleepySocketClient[]) {
  return Promise.all(clients.map(client => client.close()))
}

export function listenForClose (clients: SleepySocketClient[]) {
  const events: CloseEvent[] = []

  for (const client of clients) {
    client.on('close', rawEvent => {
      const event = rawEvent as { code: number }

      events.push({
        clientId: client.id!,
        code: event.code,
      })
    })
  }

  return events
}

export function listenForNotifications (clients: SleepySocketClient[]) {
  const received: NotificationMessage[] = []

  for (const client of clients) {
    client.on('notification', message => {
      received.push(message as NotificationMessage)
    })
  }

  return received
}

export async function createServer (testDir: string): Promise<ServerHandle> {
  const entry = path.join(testDir, 'src', 'index.ts')

  const proc = Bun.spawn([
    'bun', '--preload', 'sleepy-serv/plugin',
    entry,
  ], {
    cwd: testDir,
    stdout: 'pipe',
    stderr: 'inherit',
  })

  const reader = proc.stdout.getReader()
  const decoder = new TextDecoder()
  const output: string[] = []

  let buffer = ''
  let portResolve: ((port: number) => void) | null = null
  let portReject: ((err: Error) => void) | null = null

  const readLoop = async (): Promise<void> => {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      buffer += decoder.decode(value, { stream: true })

      const lines = buffer.split('\n')

      buffer = lines.pop()!

      for (const line of lines) {
        if (!line) {
          continue
        }

        output.push(line)

        if (portResolve && line.startsWith('Running on port:')) {
          const port = Number.parseInt(line.split(':')[1], 10)

          portResolve(port)
          portResolve = null
          portReject = null
        }
      }
    }

    if (buffer) {
      output.push(buffer)
      buffer = ''
    }

    if (portReject) {
      portReject(new Error('Server process exited before printing a port.'))

      portReject = null
      portResolve = null
    }
  }

  readLoop()

  const portPromise = new Promise<number>((resolve, reject) => {
    portResolve = resolve
    portReject = reject

    setTimeout(() => {
      if (portReject) {
        /* eslint-disable max-len */
        portReject(
          new Error(
            `Server start timed out. No Running on port: line received within ${STARTUP_TIMEOUT}ms.
            `),
        )
        /* eslint-enable max-len */
      }
    }, STARTUP_TIMEOUT)
  },
  )

  proc.exited.then(code => {
    if (portReject) {
      /* eslint-disable max-len */
      portReject(
        new Error(`Server process exited with code ${code} before printing a port.`),
      )
      /* eslint-enable max-len */

      portReject = null
      portResolve = null
    }
  })

  const port = await portPromise

  return {
    port,
    output,
    async kill () {
      proc.kill()
      await proc.exited
    },
  }
}

export async function getAdminPort (server: ServerHandle): Promise<number> {
  await waitFor(() => server.output.some(l => l.startsWith('ADMIN_PORT:')))

  const line = server.output.find(l => l.startsWith('ADMIN_PORT:'))
  const rawPort = line!.split(':')[1]
  const port = Number.parseInt(rawPort, 10)

  return port
}

export async function waitForCloseCount (server: ServerHandle, count: number) {
  await waitFor(() =>
    server.output.filter(line =>
      line.startsWith('CLOSE:'),
    ).length === count,
  )
}
