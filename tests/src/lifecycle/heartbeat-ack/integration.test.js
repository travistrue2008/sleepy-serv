import { spyOn, test, expect } from 'bun:test'
import { createServer, createSocketClient } from '../../helpers'
import { TYPES } from '../../../../packages/client/src/messages'

function nextMessage (client) {
  return new Promise(resolve => {
    client.socket.addEventListener('message', event => {
      resolve(JSON.parse(event.data))
    }, { once: true })
  })
}

test('when a heartbeat is sent', async () => {
  const server = await createServer(import.meta.dirname, {
    ws: {
      heartbeatInterval: 100,
    },
  })

  const client = await createSocketClient(server.port)
  const sendSpy = spyOn(client.socket, 'send')
  const nextMessagePromise = nextMessage(client)
  const ack = await nextMessagePromise

  await client.close()
  await server.stop(true)

  const heartbeatMessage = JSON.parse(sendSpy.mock.calls[0][0])

  expect(sendSpy).toHaveBeenCalledOnce()

  expect(heartbeatMessage).toStrictEqual({
    id: heartbeatMessage.id,
    clientId: client.clientId,
    type: TYPES.HEARTBEAT,
    timestamp: heartbeatMessage.timestamp,
    headers: {},
    body: null,
  })

  expect(ack).toStrictEqual({
    id: ack.id,
    clientId: client.clientId,
    type: TYPES.HEARTBEAT,
    timestamp: ack.timestamp,
  })
})
