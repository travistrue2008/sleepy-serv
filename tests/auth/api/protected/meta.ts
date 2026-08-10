import { authenticate } from '../../auth'

export const middleware = [
  authenticate,
]
