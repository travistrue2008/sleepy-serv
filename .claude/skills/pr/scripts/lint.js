const BOLD = '\x1b[1m'
const RED = '\x1b[31m'
const GREEN = '\x1b[32m'
const RESET = '\x1b[0m'

function info (msg) {
  console.log(`${GREEN}[lint]${RESET} ${msg}`)
}

function fail (msg) {
  console.error(`${RED}${BOLD}[lint] Error:${RESET} ${msg}`)
  process.exit(1)
}

async function run (args) {
  const proc = Bun.spawn(args, {
    stdout: 'inherit',
    stderr: 'inherit',
  })

  const code = await proc.exited

  if (code !== 0) {
    fail(`"${args.join(' ')}" exited with code ${code}`)
  }
}

async function capture (args) {
  const proc = Bun.spawn(args, { stderr: 'inherit' })
  const text = await new Response(proc.stdout).text()
  const code = await proc.exited

  if (code !== 0) {
    fail(`"${args.join(' ')}" exited with code ${code}`)
  }

  return text.trim()
}

async function main () {
  info('Running lint:fix...')
  await run(['bun', 'run', 'lint:fix'])

  const status = await capture([
    'git', 'status', '--porcelain',
  ])

  if (status) {
    info('Committing lint fixes...')

    const branch = await capture([
      'git', 'rev-parse', '--abbrev-ref', 'HEAD',
    ])

    await run(['git', 'add', '-A'])
    await run(['git', 'commit', '-m', 'Linting'])
    await run(['git', 'push', 'origin', branch])

    info('Lint fixes committed and pushed.')
  } else {
    info('No lint changes to commit.')
  }

  info('Running lint...')
  await run(['bun', 'run', 'lint'])

  info('Lint passed.')
}

main()
