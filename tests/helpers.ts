import path from 'path'

import type { App, HttpMethod } from 'sleepy-serv'

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

export const Fmt = {
  Text: 'text',
  Json: 'json',
} as const

export type Fmt = typeof Fmt[keyof typeof Fmt]

export type Query = Record<string, string>

export type RequestOptions = {
  mountPath?: string
  query?: Query
  headers?: Headers
  body?: Bun.BodyInit
}

export type HttpResult = {
  status: number
  body: unknown
}

export type RequestorMethod = (
  route: string,
  fmt: Fmt,
  opts?: RequestOptions,
) => Promise<HttpResult>

export type Requestor = {
  head: RequestorMethod
  options: RequestorMethod
  get: RequestorMethod
  put: RequestorMethod
  post: RequestorMethod
  patch: RequestorMethod
  delete: RequestorMethod
}

type RequestMethod = HttpMethod | 'OPTIONS'

async function deserializeBody (fmt: Fmt, res: Response): Promise<unknown> {
  const body = await res[fmt]()

  return body
}

async function makeRequestMethod (
  app: App,
  method: RequestMethod,
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

  const res = await fetch(url, {
    method,
    headers: opts.headers ?? new Headers(),
    body: opts.body ?? undefined /* no-op for clarity */,
  })

  return {
    status: res.status,
    body: await deserializeBody(fmt, res),
  }
}

export function createRequestor (app: App): Requestor {
  return {
    head (route, fmt, opts) {
      return makeRequestMethod(app, 'HEAD', route, fmt, opts)
    },
    options (route, fmt, opts) {
      return makeRequestMethod(app, 'OPTIONS', route, fmt, opts)
    },
    get (route, fmt, opts) {
      return makeRequestMethod(app, 'GET', route, fmt, opts)
    },
    put (route, fmt, opts = {}) {
      return makeRequestMethod(app, 'PUT', route, fmt, opts)
    },
    post (route, fmt, opts = {}) {
      return makeRequestMethod(app, 'POST', route, fmt, opts)
    },
    patch (route, fmt, opts = {}) {
      return makeRequestMethod(app, 'PATCH', route, fmt, opts)
    },
    delete (route, fmt, opts = {}) {
      return makeRequestMethod(app, 'DELETE', route, fmt, opts)
    },
  }
}
