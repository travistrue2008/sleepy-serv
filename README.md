# Sleepy Server

A directory-driven web server designed for REST-ful applications

## Important Notes

- This package requires [`bun.sh`](https://bun.sh) instead of NodeJS to run.
- This project requires bun v1.2.3 or higher

## Getting Started

Here's a minimalist example on how to create a sleepy-serv app:

```js
import {
  middleware,
  createApp,
} from 'sleepy-serv'

const PORT = 3000

const app = await createApp(PORT, import.meta.dirname)
```

The parameter for `import.meta.dirname` can be any directory you prefer, but it's common to point to the same directory as your root `index.js` file. The next step is to create an `/api` directory in the directory that you point to, and begin adding routes.

### Return Value

`sleepy-serv` was originally built for NodeJS, but it was ported to `bun` recently (before the initial release). The `createApp()` function merely calls `Bun.serve()` under-the-hood, and returns the `app` object that contains two properties:
- `routes`: Contains a list of all of the routes defined by the file structure. This is useful for debugging.
- `server`: this is the object that's returned from `Bun.serve()`. The `server` object has an `async` `.stop()` method on it, which can also be used for graceful shutdowns.

### Adding Routes

Routes are made up as _resources_ and _methods_. Resources are described by a directory path, and methods are described by files created inside of those directories. Resource segments can also represent dynamic routing params by starting the directory name with a colon (`:`).

Here's file structure example:

```
/src
  index.js # this is where we called `createApp()`
  /api
    /users
      get.js
      post.js
      /:userId
        get.js
        delete.js
        put.js
```

The file structure above create the following routes:

- `GET /users`
- `POST /users`
- `GET /users/:userId`
- `DELETE /users/:userId`
- `PUT /users/:userId`

These methods are supported:

- GET
- HEAD
- PATCH
- POST
- PUT
- DELETE

### Method Definition Files

The route's logic is implemented in the route definition files. These must `export default` either a function, or an array of functions for middleware purposes. The function signature takes a `BunRequest` object, and must return a `BunResponse` object.

Here's an example of a simple handler function:

```js
export default function (req, res, next) {
  console.log('res:', res)
  console.log('next:', next) // null for route handlers

  return new Response('Hello world')
}
```

These functions take three parameters:
- `req`: a `BunRequest` object
- `res`: a results object
- `next`: a function to call the next middleware in the chain (or `null` for the final handler)

The `res` parameter might seem familiar if coming from ExpressJS, but this parameter has a different purpose. The `res` parameter is meant to act as a dedicated, persistent object that middleware can write their results to. This way, the `req` object stays as a lean `BunRequest`.

The `next` parameter is a function that allows middleware to pass control to the next function in the middleware chain. For route handlers (the final function in the chain), `next` will be `null`.

These handlers can also be `async` functions and `sleepy-serv` will wait for them to finish before moving on.

### Middleware

As mentioned earlier, method definition files can also export an array of functions:

```js
export default [
  async (req, res, next) => {
    res.body = await req.json()
    return next() /* call the next middleware */
  },
  (req, res) => { /* notice that the last function doesn't take `next` */
    console.log('JSON body:', res.body)

    return new Response('Hello world')
  },
]
```

This is useful if you want to break common logic up into reusable functions. The functions in the array are called in-order, and each receives three parameters: `req`, `res`, and `next`.

#### Middleware Chain Behavior

Each middleware function must do one of the following:
- **Call `next()`**: Continue to the next middleware in the chain by returning `next()`
- **Return a Response**: End the chain (early) by returning a `BunResponse` object
- **Throw an error**: Stop the chain and trigger error handling

The `next` parameter will be `null` for the final function in the chain (the route handler), indicating there are no more middleware functions to call.

#### Example with Explicit `next()` Calls

```js
export default [
  (req, res, next) => {
    console.log('1st middleware')

    if (req.headers.get('authorization')) {
      return next() // continue to next middleware
    } else {
      return new Response('Unauthorized', { status: 401 }) // end chain early
    }
  },
  (req, res, next) => {
    console.log('2nd middleware')

    res.user = {
      id: 123,
      name: 'John',
    }

    return next() // continue to route handler
  },
  (req, res) => {
    console.log('Final, "route" handler')

    return new Response(`Hello ${res.user.name}`)
  },
]
```

#### Middleware Execution Order

Middleware functions are executed in the following order:
1. **App-level middleware** (defined in `createApp()` options)
2. **Directory-level middleware** (from `meta.js` files, from root to leaf)
3. **Route-level middleware** (defined in the route file array)

Each middleware function receives the same `req` and `res` objects, allowing data to be passed between middleware functions through the `res` object.

#### Breaking the Middleware Chain - Responses

You might want to break the middleware chain with a response early.

Here's an example:

```js
export default [
  (req, res, next) => {
    if (req.params.userId === '123') {
      return new Response('Returned early')
    } else {
      return next() // continue to next middleware
    }
  },
  (req, res) => {
    return new Response('End of chain')
  },
]
```

In the case above, the 1st middleware function will return a `Response` object if the route param's `userId` is equal to a specific value. In those cases, the last function in the middleware chain will not execute for that request. If the condition is not met, `next()` is called to continue to the next middleware.

#### Breaking the Middleware Chain - Errors

It's also common to throw errors for things like request validation or when a desired resource is not found. `sleepy-serv` has defined custom `Error` types for every type of 4xx and 5xx error:

```js
import { NotFoundError } from 'sleepy-serv'

export default async function (req, res) {
  const users = await sql`
SELECT * FROM Users
WHERE userId=${req.params.userId}
  `

  const foundUser = users[0]

  if (foundUser) {
    return new Response.json(foundUser)
  } else {
    throw new NotFoundError()
  }
}
```

If the user is found in the database, then the request will return with a successful response containing the user's data. If the user is not found, then the `NotFoundError()` is thrown which will automatically respond with a _404 NotFound_ error.

Throwing generic errors also works too:

```js
export default async function (req, res) {
  throw new Error('A problem occurred')
}
```

`sleepy-serv` will automatically respond with a _500 InternalServerError_ for any error types that aren't part of the `sleepy-serv` package.

## Metadata Modules

It's also possible for resource directories to contain a `meta.js` file. These files can export various things that have some sort semantic relationship to the part of the route that they're defined in.

#### Directory-Level Middleware

`meta.js` files can also export an array of middleware functions:

```js
// meta.js

export const middleware = [
  (req, res, next) => {
    /* do middleware things */
    return next() // Continue to next middleware
  },
]
```

This middleware will be applied to all sibling and descendent method definition files within that directory.

For example:

```
/src
  index.js
  /api
    meta.js # metadata
    get.js
    /users
      meta.js # metadata
      get.js
      post.js
      /:userId
        meta.js # metadata
        get.js
        delete.js
        put.js
```

The middleware defined in `/api/meta.js` will be applied by the following routes:

- `GET /`
- `GET /users`
- `POST /users`
- `GET /users/:userId`
- `DELETE /users/:userId`
- `PUT /users/:userId`

The middleware defined in `/api/users/meta.js` will be applied the following routes:

- `GET /users`
- `POST /users`
- `GET /users/:userId`
- `DELETE /users/:userId`
- `PUT /users/:userId`

The middleware defined in `/api/users/:userId/meta.js` will be applied the following routes:

- `GET /users/:userId`
- `DELETE /users/:userId`
- `PUT /users/:userId`

### Meta Files

At the time of this writing, `meta.js` only exports middleware functions, but it will eventually be able to provide additional configuration for the endpoint definitions within its scope.

## Built-In Middleware

`sleepy-serv` also comes built-in with a few useful middleware functions that are commonly used.

### parseJson(req, res, next)

This middleware parses the request's `body` property as a JSON string, and then stores the results in `res.body`. It calls `next()` if parsing succeeds, and throws a `BadRequestError` if parsing fails. Additional body parsers can be written in the future to accommodate other body encoding schemes (such as XML or protobuf).

Example usage:

```js
import { middleware } from 'sleepy-serv'

export default [
  middleware.parseJson,
  (req, res) => {
    console.log('Parsed JSON:', res.body)

    return new Response('JSON received')
  },
]
```

### validateSchema(schemas)

This function returns a middleware function that validates request data against provided schemas. The returned middleware function has the signature `(req, res, next)` and automatically calls `next()` after successful validation.

The `schemas` object can contain these optional properties:
- `headers`: takes a string formatter schema to evaluate `req.headers`
- `params`: takes a string formatter schema to evaluate `req.params`
- `query`: takes a string formatter schema to evaluate `req.query`
- `body`: takes a JSON validation schema to evaluate `res.body`

Example usage:

```js
import { middleware } from 'sleepy-serv'

export default [
  middleware.parseJson,
  middleware.validateSchema({
    params: {
      userId: { type: 'format', value: 'uuid' }
    },
    body: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        email: { type: 'string', format: 'email' }
      },
      required: ['name', 'email']
    }
  }),
  (req, res, next) => {
    // Validation passed, process the request
    return new Response('Data is valid')
  },
]
```

Here's an example of the schema in action:

```
PUT /contacts/123/addresses

{
  street1: '123 Main St.',
  street2: '#100',
  city: 'Las Vegas',
  state: 'NV',
  postalCode: '12345',
}
```

***
TODO: add JSON schema example.

Please take a look at the `lib/src/middleware.test.js` test file for a far a comprehensive set of examples on how to use this middleware.
***

The `headers`, `params`, and `query` (querystrings) can only be strings, so they're evaulated using a simplified _string format schema_ instead of a full JSON schema.

The string formatter schema looks like this:

```javascript
{
  type: 'format',
  value: 'email',
}
```

**`type`**

Can either set to `'format'` or `'pattern'`. The value of `type` determines how the `value` property is used.

**`value`**

This determines how to evaulate the string based on the `type` parameter. If `type` is set to `'format'`, then `value` can be set to one of the pre-defined formats that's provided by the JSON schema specification. If `type` is set to `'pattern'`, then `value` can be set to a regex pattern instead.

Custom formats can also be provided by using the `setValidationFormats()` during app initialization. Here's an example:

```javascript
middleware.setValidationFormats({
  phone: /^\d{10}$/, /* 10-digit, numeric string */
  postalCode: /^\d{5}$/, /* 5-digit, numeric string */
})
```

Calling `setValidationFormats()` extends the possible values that can be passed to the `value` property when evaulating strings in either the string formatter schema, or the `res.body`'s JSON schema.

## `createApp()` Options

### `middleware`

You can define app-level middleware that will be applied to all routes:

```js
import { middleware } from 'sleepy-serv'

const app = await createApp(PORT, import.meta.dirname, {
  middleware: [
    middleware.parseJson,
    (req, res, next) => {
      console.log(`${req.method} ${req.url}`)
      return next()
    },
  ],
})
```

App-level middleware is executed before any directory-level or route-level middleware.

### `hostname`

The hostname can be customized like so:

```js
createApp(import.meta.dirname, {
  hostname: 'test.sleepy-serv.com',
})
```

### `mountPath`

This adds a prefix to all routes. For example:

```js
createApp(import.meta.dirname, {
  mountPath: 'api/public',
})
```

With the directory structure

```
/src
  index.js # createApp()
  /api
    get.js
    /users
      get.js
      post.js
```

Yields these routes:

- `GET /api/public`
- `GET /api/public/users`
- `POST /api/public/users`

### `onClose`

When the app is started, the app can be shutdown gracefully by pressing Ctrl+D in the terminal. The `onClose` hook will be called during that shutdown if it's defined. `onClose` can also be `async` as well.

```js
const app = await createApp(PORT, import.meta.dirname, {
  onClose: () => console.info('closing down...'),
})
```

## Running the Local Example App

1. Install [`bun.sh`](https://bun.sh)
1. Link the library package:
    - `$ cd lib`
    - `$ bun link`
1. Link the library to the project
    - `$ cd ../example`
    - `$ npm link sleepy-serv`
1. Finally, run the app: `$ bun --watch run start`

## Running Tests

- Use `bun`'s built-in test runner
- Run tests from the `./lib` directory
