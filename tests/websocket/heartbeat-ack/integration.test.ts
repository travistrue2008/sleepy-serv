import { spyOn, test, expect } from 'bun:test'
import { createApp } from 'sleepy-serv'
import SleepySocketClient, { MessageType } from 'sleepy-socket'

import type { Message } from 'sleepy-socket'

/*
  The ack frame carries no headers or body, so it matches neither the
  client's exported `Message` nor anything the server exports publicly.
 */

type HeartbeatAck = {
  id: string
  clientId: string
  type: MessageType
  timestamp: string
}

function nextMessage (client: SleepySocketClient): Promise<unknown> {
  return new Promise(resolve => {
    client.socket!.addEventListener('message', event => {
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
  const port = app.server.port!
  const client = await SleepySocketClient.connect(host, port)
  const sendSpy = spyOn(client.socket!, 'send')
  const nextMessagePromise = nextMessage(client)
  const ack = await nextMessagePromise as HeartbeatAck

  await client.close()
  await app.close(true)

  const sent = sendSpy.mock.calls[0][0] as string
  const heartbeatMessage = JSON.parse(sent) as Message

  expect(sendSpy).toHaveBeenCalledOnce()

  expect(heartbeatMessage).toStrictEqual({
    id: heartbeatMessage.id,
    clientId: client.id!,
    type: MessageType.Heartbeat,
    timestamp: heartbeatMessage.timestamp,
    headers: {},
    body: null,
  })

  expect(ack).toStrictEqual({
    id: ack.id,
    clientId: client.id!,
    type: MessageType.Heartbeat,
    timestamp: ack.timestamp,
  })
})
