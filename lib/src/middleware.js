import Ajv from 'ajv'
import addFormats from 'ajv-formats'

import {
  UnsupportedMediaTypeError,
  UnprocessableContentError,
} from './errors'

const SCHEMA_EMPTY = {
  type: 'object',
  properties: {},
}

const FORMATS_CUSTOM = {
  phone: /^\d{10}$/,
  postalCode: /^\d{5}$/,
  state: /^(([A][ELKSZR])|([C][AOT])|([D][EC])|([F][ML])|([G][AU])|([H][I])|([I][DLNA])|([K][SY])|([L][A])|([M][EHDAINSOT])|([N][EVHJMYCD])|([M][P])|([O][HKR])|([P][WAR])|([R][I])|([S][CD])|([T][NX])|([U][T])|([V][TIA])|([W][AVIY]))$/,
}

function formatError (prefix, input) {
  const fixedPath = input.instancePath || '/'
  const suffixPath = fixedPath.replace(/\//g, '.').replace('.', '')

  return {
    path: [prefix, suffixPath].filter(item => item).join('.'),
    message: input.message,
  }
}

function buildFormatterSchema (schema) {
  if (!schema) {
    return SCHEMA_EMPTY
  }

  const properties = Object
    .entries(schema)
    .map(([key, config]) => [key, {
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

export async function parseJson (req) {
  const contentType = req.headers.get('content-type')

  if (req.method !== 'GET' && contentType !== 'application/json') {
    throw new UnsupportedMediaTypeError('content-type')
  }

  req.parsedBody = await req.json()
}

export function validateSchema (schemas) {
  return function (req) {
    const formattedSchemas = {
      headers: buildFormatterSchema(schemas.headers),
      params: buildFormatterSchema(schemas.params),
      query: buildFormatterSchema(schemas.query),
      parsedBody: schemas.parsedBody || SCHEMA_EMPTY,
    }

    const ajv = new Ajv({
      allErrors: true,
      removeAdditional: 'all',
    })

    addFormats(ajv)

    Object
      .entries(FORMATS_CUSTOM)
      .forEach(([k, v]) => ajv.addFormat(k, v))

    const errors = Object
      .entries(formattedSchemas)
      .reduce((accum, [key, schema]) => {
        const data = req[key]
        const valid = schema ? ajv.validate(schema, data) : true

        return !valid
          ? [
            ...accum,
            ...ajv.errors.map(item => formatError(key, item)),
          ]
          : accum
      }, [])

    if (errors.length > 0) {
      throw new UnprocessableContentError(errors)
    }
  }
}
