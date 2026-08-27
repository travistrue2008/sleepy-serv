import { jest, mock, test, expect } from 'bun:test'
import { CloseReason, createApp } from '../../../src'
import { createSocketClient } from '../../helpers'

test('when connection is "dropped"', async () => {
  const onClose = mock()

  const app = await createApp(0, import.meta.dirname, {
    ws: { onClose },
  })

  const ws = await createSocketClient(app)
  const clientId = ws.clientId

  ws.socket.close(4000)
  jest.advanceTimersByTime(100)

  await Promise.resolve()
  await app.close(true)

  expect(onClose).toHaveBeenCalledOnce()

  expect(onClose).toHaveBeenCalledWith(
    clientId,
    CloseReason.Dropped,
  )
})
