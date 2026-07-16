/*
  Present so api/ws is a non-leaf directory, which lets meta.js sit beside it
  with no sibling method file. Defers to the built-in reclaim handler.
 */

export default function (_req, res, next) {
  return next(res)
}
