export default function (req, _res, next) {
  if (req.query.err !== undefined) {
    throw new Error('Error from PUT middleware')
  }

  return next({ PUT: true })
}
