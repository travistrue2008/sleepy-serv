import { middleware } from 'sleepy-serv'

const { validateSchema } = middleware

export default [
  validateSchema({
    query: {
      term: {
        type: 'minLength',
        value: 3,
      },
    },
    /* accept an absent body; otherwise the default object schema 422s a
       body-less socket request before the query is ever checked */
    body: {},
  }),
  (req) => Response.json({ term: req.query.term }),
]
