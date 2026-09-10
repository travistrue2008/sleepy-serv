import { SignJWT, jwtVerify } from 'jose'
import { UnauthorizedError } from 'sleepy-serv'

import type { JWTPayload } from 'jose'
import type { AsyncHandlerResult, NextFn, Request } from 'sleepy-serv'

/*
  A working example of authentication through the middleware system. The JWT
  bits below are deliberately self-contained: `jose` signs and verifies an
  HS256 token against a shared secret. Everything inside `authenticate` touching
  `jose` is the seam you would swap for a 3rd-party auth service (Auth0, Clerk,
  a bespoke token-introspection endpoint); the middleware contract around it
  stays identical.

  The important property for this repo is that REST requests and WebSocket
  request frames flow through the *same* middleware chain, so a single guard
  reading the `Authorization: Bearer <jwt>` header covers both transports with
  no transport-specific code.
 */

/* what `authenticate` contributes to the middleware accumulator */

export type Authenticated = {
  user: JWTPayload
}

export type Accum = Record<string, unknown>

/*
  What the `/ws` handshake middleware leaves in the accumulator, which
  the terminal surfaces to the client as `client.connectionData`.
 */

export type ConnectionData = {
  token: string
}

const SECRET = new TextEncoder().encode('sleepy-serv-example-secret')

const CLAIMS = {
  sub: 'user-123',
}

export async function authorToken (): Promise<string> {
  return new SignJWT(CLAIMS)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(SECRET)
}

export async function authenticate (
  req: Request,
  res: Accum | null,
  next: NextFn,
): AsyncHandlerResult {
  const header = req.headers.get('authorization')

  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing bearer token')
  }

  const token = header.slice('Bearer '.length)

  let payload: JWTPayload

  try {
    ({ payload } = await jwtVerify(token, SECRET))
  } catch {
    throw new UnauthorizedError('Invalid token')
  }

  return next({
    ...res,
    user: payload,
  })
}
