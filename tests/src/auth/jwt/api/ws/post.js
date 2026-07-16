import { authorToken } from '../../auth'

export default async function signJwt (_req, res, next) {
  res.token = await authorToken()

  return next()
}
