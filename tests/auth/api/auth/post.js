import { authorToken } from '../../auth'

export default async function signJwt (_req, _res) {
  const token = await authorToken()

  return new Response(token)
}
