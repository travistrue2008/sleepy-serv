import { spyOn, test, expect } from 'bun:test'
import { createApp } from 'sleepy-serv'
import SleepySocketClient, { TYPES } from 'sleepy-socket'

function nextMessage (client) {
  return new Promise(resolve => {
    client.socket.addEventListener('message', event => {
      resolve(JSON.parse(event.data))
    }, { once: true })
  })
}

test('when a heartbeat is sent', async () => {
  const app = await createApp(0, import.meta.dirname, {
    ws: {
      heartbeatInterval: 100,
    },
  })

  const host = app.server.url.hostname
  const client = await SleepySocketClient.connect(host, app.server.port)
  const sendSpy = spyOn(client.socket, 'send')
  const nextMessagePromise = nextMessage(client)
  const ack = await nextMessagePromise

  await client.close()
  await app.server.stop(true)

  const heartbeatMessage = JSON.parse(sendSpy.mock.calls[0][0])

  expect(sendSpy).toHaveBeenCalledOnce()

  expect(heartbeatMessage).toStrictEqual({
    id: heartbeatMessage.id,
    clientId: client.id,
    type: TYPES.HEARTBEAT,
    timestamp: heartbeatMessage.timestamp,
    headers: {},
    body: null,
  })

  expect(ack).toStrictEqual({
    id: ack.id,
    clientId: client.id,
    type: TYPES.HEARTBEAT,
    timestamp: ack.timestamp,
  })
})
