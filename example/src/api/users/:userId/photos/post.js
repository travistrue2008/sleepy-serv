export default [
  _req => Response.json({
    id: 789,
    data: '0123456789ABCDEF',
  }, { status: 201 }),
]
