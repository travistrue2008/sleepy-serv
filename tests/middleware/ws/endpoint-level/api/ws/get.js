export default function (req, _res, next) {
  if (req.query.err !== undefined) {
    throw new Error('Error from GET middleware')
  }

  return next({ GET: true })
}
