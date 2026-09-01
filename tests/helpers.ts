import path from 'path'

import type { App, HttpMethod } from 'sleepy-serv'

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

export type Query = Record<string, string>

export type RequestOptions = {
  mountPath?: string
  query?: Query
  headers?: Headers
  body?: Bun.BodyInit | number
}

export type RequestorMethodFn = (
  route: string,
  fmt: Fmt,
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

async function deserializeBody (fmt: Fmt, res: Response): Promise<unknown> {
  const body = await res[fmt]()

  return body
}

async function makeRequestMethod (
  app: App,
  method: HttpMethod | 'OPTIONS',
  route: string,
  fmt: Fmt,
  opts: RequestOptions = {},
): Promise<HttpResult> {
  const query = new URLSearchParams(opts.query ?? {}).toString()
  const mountPath = opts.mountPath ?? ''
  const pathname = path.join(mountPath, route)
  const trimmed = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
  const suffix = query ? `?${query}` : ''
  const url = `${app.server.url.origin}${trimmed}${suffix}`

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

export function createRequestor (app: App): Requestor {
  return {
    options (route: string, fmt: Fmt, opts: RequestOptions = {}) {
      return makeRequestMethod(app, 'OPTIONS', route, fmt, opts)
    },
    head (route: string, fmt: Fmt, opts: RequestOptions = {}) {
      return makeRequestMethod(app, 'HEAD', route, fmt, opts)
    },
    get (route: string, fmt: Fmt, opts: RequestOptions = {}) {
      return makeRequestMethod(app, 'GET', route, fmt, opts)
    },
    put (route: string, fmt: Fmt, opts: RequestOptions = {}) {
      return makeRequestMethod(app, 'PUT', route, fmt, opts)
    },
    post (route: string, fmt: Fmt, opts: RequestOptions = {}) {
      return makeRequestMethod(app, 'POST', route, fmt, opts)
    },
    patch (route: string, fmt: Fmt, opts: RequestOptions = {}) {
      return makeRequestMethod(app, 'PATCH', route, fmt, opts)
    },
    delete (route: string, fmt: Fmt, opts: RequestOptions = {}) {
      return makeRequestMethod(app, 'DELETE', route, fmt, opts)
    },
  }
}
