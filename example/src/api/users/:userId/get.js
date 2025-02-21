export default [
  _req => console.info('middleware from: /api/users/:userId/get.js'),
  _req => {
    return Response.json({
      id: 1,
      firstName: 'Tony',
      lastName: 'Stark',
      company: 'Stark Industries',
    })
  },
]
