export default function (req, _res, next) {
  if (req.query.err !== undefined) {
    throw new Error('Error from POST middleware')
  }

  return next({ POST: true })
}
