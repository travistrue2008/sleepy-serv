import { createApp } from 'sleepy-serv'

const originalServe = Bun.serve

type Options = Parameters<typeof Bun.serve>[0]

Bun.serve = ((opts: Options) => {
  if ('hostname' in opts && opts.hostname) {
    console.log(`HOSTNAME:${opts.hostname}`)
  }

  return originalServe({
    ...opts,
    hostname: '0.0.0.0',
  } as Options)
}) as typeof Bun.serve

createApp(0, {
  hostname: 'test.sleepy-serv.com',
})
