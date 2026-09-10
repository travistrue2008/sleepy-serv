import fs from 'fs'
import path from 'path'

export type MethodEntry = {
  method: string
  path: string
  modulePath: string
}

export type MetaEntry = {
  path: string
  modulePath: string
}

export type ScanResult = {
  methods: MethodEntry[]
  meta: MetaEntry[]
}

type DirEntry = {
  path: string
  stat: fs.Stats
}

const ALLOWED_FILES_META = ['meta.js', 'meta.ts']

const ALLOWED_FILES_METHODS = [
  'head.js',
  'head.ts',
  'get.js',
  'get.ts',
  'put.js',
  'put.ts',
  'post.js',
  'post.ts',
  'patch.js',
  'patch.ts',
  'delete.js',
  'delete.ts',
]

function validateLeafDirectory (
  targetPath: string,
  filenames: string[],
  entries: DirEntry[],
): void {
  const hasDirectories = entries.some(entry => entry.stat.isDirectory())

  if (!hasDirectories) {
    const hasMethodEntry = filenames.some(filename =>
      ALLOWED_FILES_METHODS.includes(filename),
    )

    if (!hasMethodEntry) {
      throw new TypeError(`
Directory is a leaf, but doesn't contain a method file:
${targetPath}
      `.trim())
    }
  }
}

function validateDirectory (targetPath: string, entries: DirEntry[]): void {
  const filenames = entries
    .filter(entry => entry.stat.isFile())
    .map(entry => path.basename(entry.path))

  validateLeafDirectory(targetPath, filenames, entries)
}

function getAllFilePathsRec (
  targetPath: string,
  paths: string[],
): string[] {
  const entries = fs.readdirSync(targetPath)

  const children = entries.map(item => {
    const fullPath = path.join(targetPath, item)

    return {
      path: fullPath,
      stat: fs.statSync(fullPath),
    }
  })

  validateDirectory(targetPath, children)

  return children.reduce<string[]>((accum, curr) => {
    const result = curr.stat.isDirectory()
      ? getAllFilePathsRec(curr.path, paths)
      : [curr.path]

    return [...accum, ...result]
  }, [])
}

function getFilteredFilePaths (
  targetPath: string,
  allowedFiles: string[],
): string[] {
  const allPaths = getAllFilePathsRec(targetPath, [])

  return allPaths.filter(item =>
    allowedFiles.includes(path.basename(item)),
  )
}

function getMethodFilePaths (targetPath: string): string[] {
  return getFilteredFilePaths(targetPath, ALLOWED_FILES_METHODS)
}

function getMetaFilePaths (targetPath: string): string[] {
  return getFilteredFilePaths(targetPath, ALLOWED_FILES_META)
}

export function scanRoutes (apiRoot: string): ScanResult {
  const resolved = path.resolve(apiRoot)
  const methodPaths = getMethodFilePaths(resolved)
  const metaPaths = getMetaFilePaths(resolved)

  const methods = methodPaths.map(modulePath => {
    const trimmedPath = modulePath.replace(resolved, '')
    const segments = trimmedPath.split('.')[0].split('/')
    const lastIndex = segments.length - 1
    const basePath = segments.slice(0, lastIndex).join('/')

    return {
      method: segments[lastIndex].toUpperCase(),
      path: basePath || '/',
      modulePath,
    }
  })

  const meta = metaPaths.map(modulePath => {
    const dirPath = path.dirname(modulePath)
    const relativeDirPath = dirPath.replace(resolved, '')

    return {
      path: relativeDirPath || '/',
      modulePath,
    }
  })

  return {
    methods,
    meta,
  }
}
