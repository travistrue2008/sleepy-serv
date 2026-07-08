import { setSystemTime, beforeEach, afterEach } from 'bun:test'

beforeEach(() => {
  const dt = new Date('2000-01-01T00:00:00.000Z')

  setSystemTime(dt)
})

afterEach(() => {
  setSystemTime()
})
