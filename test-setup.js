import { jest, expect, setSystemTime, beforeEach, afterEach } from 'bun:test'

const EPOCH = new Date('2000-01-01T00:00:00.000Z')

function getRelativePath () {
  return Bun.main.replace(process.cwd(), '')
}

beforeEach(() => {
  if (getRelativePath().startsWith('/packages')) {
    jest.useFakeTimers()
    setSystemTime(EPOCH)
  }
})

afterEach(() => {
  if (getRelativePath().startsWith('/packages')) {
    setSystemTime()
    jest.useRealTimers()
  }
})
