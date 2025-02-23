export default [
  _req => {
    throw new Error('bad')
  },
  /* Unreachable. This is here to make the previous function middleware */
  /* istanbul ignore next */
  _req => {
    return new Response('Hello world')
  },
]