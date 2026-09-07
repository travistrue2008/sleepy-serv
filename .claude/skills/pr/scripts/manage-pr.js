const BOLD = '\x1b[1m'
const RED = '\x1b[31m'
const GREEN = '\x1b[32m'
const RESET = '\x1b[0m'

function info (msg) {
  console.log(`${GREEN}[manage-pr]${RESET} ${msg}`)
}

function fail (msg) {
  console.error(`${RED}${BOLD}[manage-pr] Error:${RESET} ${msg}`)
  process.exit(1)
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
  const notes = await capture([
    'bun', '.github/scripts/changelog.js', 'extract',
  ])

  if (!notes) {
    fail(
      'The [Unreleased] section of CHANGELOG.md is empty. '
      + 'Nothing to use as a PR description.',
    )
  }

  const branch = await capture([
    'git', 'rev-parse', '--abbrev-ref', 'HEAD',
  ])

  const prJson = await capture([
    'gh', 'pr', 'list',
    '--head', branch,
    '--json', 'number',
    '--limit', '1',
  ])

  const prs = JSON.parse(prJson)

  if (prs.length === 0) {
    info('No existing PR found. Creating one...')
    await capture([
      'gh', 'pr', 'create',
      '--base', 'main',
      '--head', branch,
      '--title', branch,
      '--body', notes,
    ])
    info('PR created.')
  } else {
    const number = prs[0].number
    info(`Updating existing PR #${number}...`)
    await capture([
      'gh', 'pr', 'edit', String(number),
      '--body', notes,
    ])
    info(`PR #${number} updated.`)
  }
}

main()
