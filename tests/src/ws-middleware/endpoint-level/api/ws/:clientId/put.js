/*
  A pass-through method file on the reclaim endpoint. It defers to the built-in
  reclaim handler by returning next().
 */

export default function (_req, _res, next) {
  return next()
}
