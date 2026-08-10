import Ajv from 'ajv'
import addFormats from 'ajv-formats'

import { formatError } from './utils'

import {
  BadRequestError,
  UnsupportedMediaTypeError,
  UnprocessableContentError,
} from './errors'

import type { Format, Schema, ValidateFunction } from 'ajv'
import type { FormattedError, Middleware, NextFn } from './utils'

export type FormatterField = {
  type: string
  value: unknown
}

export type FormatterSchema = Record<string, FormatterField>

export type ValidationSchemas = {
  headers?: FormatterSchema
  params?: FormatterSchema
  query?: FormatterSchema
  body?: Schema
}

export type SchemaKey = keyof ValidationSchemas

export type ParsableRequest = {
  headers: Headers
  json: () => Promise<unknown>
}

export type ValidatableRequest = {
  headers: Headers
  params: unknown
  query: unknown
}

let _schemasCompiled = false
let _customFormats: Record<string, Format> | null = null

async function parseBody (req: ParsableRequest): Promise<unknown> {
  try {
    const result = await req.json()

    return result
  } catch {
    throw new BadRequestError('Invalid JSON')
  }
}

function buildFormatterSchema (schema: FormatterSchema): Schema {
  const properties = Object
    .entries(schema)
    .map(([key, config]): [string, Record<string, unknown>] => [
      key,
      {
        type: 'string',
        [config.type]: config.value,
      },
    ])
    .reduce((accum: Record<string, unknown>, [key, value]) => ({
      ...accum,
      [key]: value,
    }), {})

  return {
    type: 'object',
    properties,
  }
}

function normalizeHeaderKeys (schema: FormatterSchema): FormatterSchema {
  return Object.fromEntries(
    Object
      .entries(schema)
      .map(([field, config]) => [field.toLowerCase(), config]),
  )
}

function compileSchemas (
  schemas: ValidationSchemas,
): [SchemaKey, ValidateFunction][] {
  return (Object.entries(schemas) as [SchemaKey, FormatterSchema | Schema][])
    .reduce((
      accum: [SchemaKey, Schema][],
      [key, schema],
    ): [SchemaKey, Schema][] => {
      const formatterSchema = key === 'headers'
        ? normalizeHeaderKeys(schema as FormatterSchema)
        : schema as FormatterSchema

      const formattedSchema = key !== 'body'
        ? buildFormatterSchema(formatterSchema)
        : schema as Schema

      return [
        ...accum,
        [key, formattedSchema],
      ]
    }, [])
    .map(([key, schema]): [SchemaKey, ValidateFunction] => {
      const ajv = new Ajv({
        allErrors: true,
        removeAdditional: 'all',
      })

      addFormats(ajv)

      Object
        .entries(_customFormats ?? {})
        .forEach(([k, v]) => ajv.addFormat(k, v))

      const validator = ajv.compile(schema)

      return [key, validator]
    })
}

export function parseJsonBody (): Middleware<ParsableRequest> {
  return async (
    req: ParsableRequest,
    res: unknown,
    next: NextFn | null,
  ): Promise<unknown> => {
    const contentType = req.headers.get('content-type')

    if (!contentType) {
      return (next as NextFn)(res)
    }

    if (!contentType.startsWith('application/json')) {
      throw new UnsupportedMediaTypeError('content-type')
    }

    const body = await parseBody(req)

    return (next as NextFn)(body)
  }
}

export function setValidationFormats (
  formats: Record<string, Format>,
): void {
  if (_customFormats) {
    console.warn('setValidationFormats() - already initialized')
  }

  if (_schemasCompiled) {
    console.warn('setValidationFormats() - called after compilation')
  }

  _customFormats = formats
}

/* only for testing purposes */

export function resetValidationFormatsState (): void {
  _customFormats = null
  _schemasCompiled = false
}

export function validateSchemas (
  schemas: ValidationSchemas,
): Middleware<ValidatableRequest> {
  const entries = compileSchemas(schemas)

  _schemasCompiled = true

  return (
    req: ValidatableRequest,
    res: unknown,
    next: NextFn | null,
  ): unknown => {
    const errors = entries.reduce((accum: FormattedError[], [
      key,
      validator,
    ]) => {
      const raw = key === 'body' ? res : req[key]
      const data = raw instanceof Headers ? Object.fromEntries(raw) : raw
      const valid = validator(data)

      return !valid
        ? [
          ...accum,
          ...validator.errors!.map(item => formatError(key, item)),
        ]
        : accum
    }, [])

    if (errors.length > 0) {
      throw new UnprocessableContentError(errors)
    }

    return (next as NextFn)(res)
  }
}
