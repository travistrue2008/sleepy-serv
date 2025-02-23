import { incrementPortCounter } from './tests/_helpers'

import {
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
} from 'bun:test'

beforeAll(() => {
  /* global before-all hook */
})

afterAll(() => {
  /* global after-all hook */
})

beforeEach(() => {
  /* global before-each hook */
})

afterEach(() => {
  /* global after-each hook */

  incrementPortCounter()
})
