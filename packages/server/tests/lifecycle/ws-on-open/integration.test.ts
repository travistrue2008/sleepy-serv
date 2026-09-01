import { mock, test, expect } from 'bun:test'
import { createApp } from '../../../src'
import { createSocketClient } from '../../helpers'

test('when a connection is opened', async () => {
  const onOpen = mock()

  const app = await createApp(0, import.meta.dirname, {
    ws: { onOpen },
  })

  const ws = await createSocketClient(app)

  await ws.close()
  await app.close(true)

  expect(onOpen).toHaveBeenCalledOnce()
  expect(onOpen).toHaveBeenCalledWith(ws.clientId)
})
