import { jest, setSystemTime, beforeEach, afterEach } from 'bun:test'

const EPOCH = new Date('2000-01-01T00:00:00.000Z')

beforeEach(() => {
  jest.useFakeTimers()
  setSystemTime(EPOCH)
})

afterEach(() => {
  setSystemTime()
  jest.useRealTimers()
})
