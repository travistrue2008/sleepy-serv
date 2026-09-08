import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const RED = '\x1b[31m'
const BOLD = '\x1b[1m'
const RESET = '\x1b[0m'

function fail (msg) {
  console.error(`${RED}${BOLD}[find-readmes] Error:${RESET} ${msg}`)
  process.exit(1)
}

function main () {
  const missing = []
  const found = []

  if (!existsSync('README.md')) {
    missing.push('README.md')
  } else {
    found.push('README.md')
  }

  if (existsSync('packages')) {
    const entries = readdirSync('packages')

    for (const entry of entries) {
      const dir = join('packages', entry)

      if (!statSync(dir).isDirectory()) continue

      const readme = join(dir, 'README.md')

      if (!existsSync(readme)) {
        missing.push(readme)
      } else {
        found.push(readme)
      }
    }
  }

  if (missing.length > 0) {
    fail(
      'Missing expected READMEs:\n'
      + missing.map(p => `  - ${p}`).join('\n'),
    )
  }

  console.log(JSON.stringify(found))
}

main()
