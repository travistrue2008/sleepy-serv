import fs from 'fs'
import path from 'path'

const TEMPLATES: Record<string, string> = {
  'sleepy.config.ts': 'export default {}',

  'tsconfig.json': JSON.stringify({
    compilerOptions: {
      strict: true,
      skipLibCheck: true,
      target: 'ESNext',
      module: 'ESNext',
      moduleResolution: 'bundler',
      types: ['bun-types'],
    },
  }, null, 2) + '\n',

  'src/index.ts': `
import { createApp } from \'sleepy-serv\'

createApp(3000)
  `.trim().concat('\n'),

  'src/api/get.ts': `
export default function handler (): Response {
  return Response.json({ ok: true })
}
  `.trim().concat('\n'),
}

function writeIfMissing (filePath: string, content: string): boolean {
  if (fs.existsSync(filePath)) {
    console.warn(`  skip: ${filePath} (already exists)`)

    return false
  }

  const dir = path.dirname(filePath)

  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(filePath, content)
  console.log(`  create: ${filePath}`)

  return true
}

function writePackageJson (): void {
  const filePath = 'package.json'
  const name = path.basename(process.cwd())

  const scripts = {
    dev: 'sleepy dev',
    build: 'sleepy build',
  }

  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath, 'utf-8')
    const existing = JSON.parse(raw)

    existing.scripts = {
      ...existing.scripts,
      ...scripts,
    }

    fs.writeFileSync(
      filePath,
      JSON.stringify(existing, null, 2) + '\n',
    )

    console.log(`  update: ${filePath}`)

    return
  }

  const pkg = {
    name,
    version: '0.0.0',
    type: 'module',
    scripts,
    dependencies: {
      'sleepy-serv': 'latest',
    },
  }

  fs.writeFileSync(
    filePath,
    JSON.stringify(pkg, null, 2) + '\n',
  )

  console.log(`  create: ${filePath}`)
}

export async function init (): Promise<void> {
  console.log('')

  writePackageJson()

  for (const [relPath, content] of Object.entries(TEMPLATES)) {
    writeIfMissing(relPath, content)
  }

  console.log('')
  console.log('Created sleepy-serv project in ./')
  console.log('')
  console.log('  bun install')
  console.log('  sleepy dev')
  console.log('')
}
