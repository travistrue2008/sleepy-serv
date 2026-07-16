import { authorToken } from '../../auth'

export default async function signJwt (_req, res, next) {
  return next({
    ...res,
    token: await authorToken(),
  })
}
