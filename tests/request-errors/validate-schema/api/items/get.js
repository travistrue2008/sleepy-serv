import { validateSchemas } from 'sleepy-serv'

export default [
  validateSchemas({
    query: {
      term: {
        type: 'minLength',
        value: 3,
      },
    },
    body: {},
  }),
  (req) => Response.json({ term: req.query.term }),
]
