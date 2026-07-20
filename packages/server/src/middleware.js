import Ajv from 'ajv'
import addFormats from 'ajv-formats'

import { formatError } from './utils'

import {
  BadRequestError,
  UnsupportedMediaTypeError,
  UnprocessableContentError,
} from './errors'

let _schemasCompiled = false
let _customFormats = null

async function parseBody (req) {
  try {
    const result = await req.json()

    return result
  } catch {
    throw new BadRequestError('Invalid JSON')
  }
}

function buildFormatterSchema (schema) {
  const properties = Object
    .entries(schema)
    .map(([key, config]) => [
      key,
      {
        type: 'string',
        [config.type]: config.value,
      },
    ])
    .reduce((accum, [key, value]) => ({
      ...accum,
      [key]: value,
    }), {})

  return {
    type: 'object',
    properties,
  }
}

function compileSchemas (schemas) {
  return Object
    .entries(schemas)
    .reduce((accum, [key, schema]) => {
      const formattedSchema = key !== 'body'
        ? buildFormatterSchema(schema)
        : schema

      return [
        ...accum,
        [key, formattedSchema],
      ]
    }, [])
    .map(([key, schema]) => {
      const ajv = new Ajv({
        allErrors: true,
        removeAdditional: 'all',
      })

      addFormats(ajv)

      Object
        .entries(_customFormats ?? [])
        .forEach(([k, v]) => ajv.addFormat(k, v))

      const validator = ajv.compile(schema)

      return [key, validator]
    })
}

export function parseJsonBody () {
  return async (req, res, next) => {
    const contentType = req.headers.get('content-type')

    if (!contentType) {
      return next(res)
    }

    if (!contentType.startsWith('application/json')) {
      throw new UnsupportedMediaTypeError('content-type')
    }

    const body = await parseBody(req)

    return next(body)
  }
}

export function setValidationFormats (formats) {
  if (_customFormats) {
    console.warn('setValidationFormats() - already initialized')
  }

  if (_schemasCompiled) {
    console.warn('setValidationFormats() - called after compilation')
  }

  _customFormats = formats
}

/* only for testing purposes */

export function resetValidationFormatsState () {
  _customFormats = null
  _schemasCompiled = false
}

export function validateSchemas (schemas) {
  const entries = compileSchemas(schemas)

  _schemasCompiled = true

  return (req, res, next) => {
    const errors = entries.reduce((accum, [key, validator]) => {
      const data = key === 'body' ? res : req[key]
      const valid = validator(data)

      return !valid
        ? [
          ...accum,
          ...validator.errors.map(item => formatError(key, item)),
        ]
        : accum
    }, [])

    if (errors.length > 0) {
      throw new UnprocessableContentError(errors)
    }

    return next(res)
  }
}
