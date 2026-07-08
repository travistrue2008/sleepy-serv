import { UnprocessableContentError } from "../../../../src/errors";

export default function (_req) {
  throw new UnprocessableContentError({
    firstName: 'Required',
  })
}
