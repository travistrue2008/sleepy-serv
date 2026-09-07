const POLL_INTERVAL_MS = 10_000
const VALID_BUMPS = ['major', 'minor', 'patch']
const BOLD = '\x1b[1m'
const RED = '\x1b[31m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const RESET = '\x1b[0m'

function info (msg) {
  console.log(`${GREEN}[auto-publish]${RESET} ${msg}`)
}

function warn (msg) {
  console.log(`${YELLOW}[auto-publish]${RESET} ${msg}`)
}

function fail (msg) {
  console.error(`${RED}${BOLD}[auto-publish] Error:${RESET} ${msg}`)
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

function sleep (ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main () {
  const bump = Bun.argv[2]

  if (!bump || !VALID_BUMPS.includes(bump)) {
    fail(
      `Invalid bump type: "${bump}". `
      + `Must be one of: ${VALID_BUMPS.join(', ')}`,
    )
  }

  info(`Triggering publish workflow with bump=${bump}...`)
  await capture([
    'gh', 'workflow', 'run', 'publish.yml',
    '-f', `bump=${bump}`,
  ])

  info('Waiting for publish workflow to start...')
  await sleep(POLL_INTERVAL_MS)

  while (true) {
    const json = await capture([
      'gh', 'run', 'list',
      '-w', 'publish.yml',
      '--limit', '1',
      '--json', 'status,conclusion,name,databaseId',
    ])

    const runs = JSON.parse(json)

    if (runs.length === 0) {
      warn('No publish workflow runs found yet. Retrying...')
      await sleep(POLL_INTERVAL_MS)
      continue
    }

    const run = runs[0]

    if (run.status !== 'completed') {
      warn(`Publish workflow is ${run.status}...`)
      await sleep(POLL_INTERVAL_MS)
      continue
    }

    if (run.conclusion !== 'success') {
      fail(
        `Publish workflow finished with `
        + `conclusion: ${run.conclusion}`,
      )
    }

    info('Publish workflow completed successfully.')
    return
  }
}

main()
