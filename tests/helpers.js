import path from 'path'

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

export const FMT = {
  NONE: 'none',
  TEXT: 'text',
  JSON: 'json',
}

async function deserializeBody (fmt, res) {
  const methodName = fmt ?? 'json'
  const body = await res[methodName]()

  return body
}

async function makeRequestMethod (app, method, route, fmt, opts = {}) {
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

export function createRequestor (app) {
  return {
    get (route, fmt, opts) {
      return makeRequestMethod(app, 'GET', route, fmt, opts)
    },
    put (route, fmt, opts = {}) {
      return makeRequestMethod(app, 'PUT', route, fmt, opts)
    },
    post (route, fmt, opts = {}) {
      return makeRequestMethod(app, 'POST', route, fmt, opts)
    },
  }
}
