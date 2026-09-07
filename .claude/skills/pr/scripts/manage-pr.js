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

async function extractChangelog () {
  const proc = Bun.spawn(
    ['bun', '.github/scripts/changelog.js', 'extract'],
    { stderr: 'pipe' },
  )

  const text = await new Response(proc.stdout).text()

  await proc.exited

  return text.trim()
}

function buildBody (changelog, structural) {
  const sections = []

  if (changelog) {
    sections.push('## Changelog\n\n' + changelog)
  }

  if (structural) {
    sections.push('## Structural\n\n' + structural)
  }

  return sections.join('\n\n')
}

async function main () {
  const structural = Bun.argv[2] || ''
  const changelog = await extractChangelog()
  const body = buildBody(changelog, structural)

  if (!body) {
    fail(
      'No PR description available. The [Unreleased] section '
      + 'is empty and no structural summary was provided.',
    )
  }

  if (changelog) {
    info('Changelog entries found.')
  }

  if (structural) {
    info('Structural summary provided.')
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
      '--body', body,
    ])
    info('PR created.')
  } else {
    const number = prs[0].number
    info(`Updating existing PR #${number}...`)
    await capture([
      'gh', 'pr', 'edit', String(number),
      '--body', body,
    ])
    info(`PR #${number} updated.`)
  }
}

main()
