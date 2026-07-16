import { SignJWT, jwtVerify } from 'jose'
import { UnauthorizedError } from 'sleepy-serv'

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

const SECRET = new TextEncoder().encode('sleepy-serv-example-secret')

const CLAIMS = {
  sub: 'user-123',
}

export async function authorToken () {
  return new SignJWT(CLAIMS)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(SECRET)
}

export async function authenticate (req, res, next) {
  const header = req.headers.get('authorization')

  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedError('Missing bearer token')
  }

  const token = header.slice('Bearer '.length)

  try {
    const { payload } = await jwtVerify(token, SECRET)

    res.user = payload
  } catch {
    throw new UnauthorizedError('Invalid token')
  }

  return next()
}
