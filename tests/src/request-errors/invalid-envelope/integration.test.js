import { test, expect } from 'bun:test'
import { TYPES } from 'sleepy-socket'
import { boot } from '../../helpers'

import {
  UnprocessableContentError,
} from '../../../../packages/server/src/errors'

test('when the request envelope fails schema validation', async () => {
  const { client, shutdown } = await boot(import.meta.dirname)
  const res = await client.send({ route: '/' })

  await shutdown()

  expect(res).toStrictEqual({
    id: res.id,
    clientId: client.clientId,
    type: TYPES.RESPONSE,
    timestamp: res.timestamp,
    status: UnprocessableContentError.status,
    headers: {
      'content-type': 'application/json;charset=utf-8',
    },
    body: [
      {
        path: '',
        message: `must have required property 'method'`,
      },
    ],
  })
})
