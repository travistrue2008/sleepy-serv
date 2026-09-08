const POLL_INTERVAL_MS = 10_000
const BOLD = '\x1b[1m'
const RED = '\x1b[31m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const RESET = '\x1b[0m'

function info (msg) {
  console.log(`${GREEN}[auto-merge]${RESET} ${msg}`)
}

function warn (msg) {
  console.log(`${YELLOW}[auto-merge]${RESET} ${msg}`)
}

function fail (msg) {
  console.error(`${RED}${BOLD}[auto-merge] Error:${RESET} ${msg}`)
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

async function getPrNumber () {
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
    fail(`No PR found for branch "${branch}".`)
  }

  return prs[0].number
}

async function waitForPrChecks (prNumber) {
  info(`Waiting for PR #${prNumber} checks to complete...`)

  while (true) {
    const requiredJson = await capture([
      'gh', 'pr', 'checks', `${prNumber}`,
      '--json', 'name,bucket',
      '--required',
    ])

    const required = JSON.parse(requiredJson)
    const requiredFailed = required.filter(check => check.bucket === 'fail')

    if (requiredFailed.length > 0) {
      const names = requiredFailed.map(check => check.name).join(', ')

      fail(`Required checks failed: ${names}`)
    }

    const allJson = await capture([
      'gh', 'pr', 'checks', `${prNumber}`,
      '--json', 'name,bucket',
    ])

    const all = JSON.parse(allJson)

    if (all.length === 0) {
      warn('No checks found yet. Retrying...')

      await sleep(POLL_INTERVAL_MS)

      continue
    }

    const pending = all.filter(check => check.bucket === 'pending')

    if (pending.length === 0) {
      info('All checks finished. Required checks passed.')

      return
    }

    const names = pending.map(check => check.name).join(', ')

    warn(`Waiting on: ${names}`)
    await sleep(POLL_INTERVAL_MS)
  }
}

async function waitForMainBuild () {
  info('Waiting for main branch build to complete...')

  await sleep(POLL_INTERVAL_MS)

  while (true) {
    const json = await capture([
      'gh', 'run', 'list',
      '--branch', 'main',
      '--limit', '1',
      '--json', 'status,conclusion,name',
    ])

    const runs = JSON.parse(json)

    if (runs.length === 0) {
      warn('No workflow runs found on main yet. Retrying...')
      await sleep(POLL_INTERVAL_MS)
      continue
    }

    const run = runs[0]

    if (run.status !== 'completed') {
      warn(`Build "${run.name}" is ${run.status}...`)
      await sleep(POLL_INTERVAL_MS)
      continue
    }

    if (run.conclusion !== 'success') {
      fail(
        `Main branch build "${run.name}" `
        + `finished with conclusion: ${run.conclusion}`,
      )
    }

    info('Main branch build passed.')
    return
  }
}

async function main () {
  const prNumber = await getPrNumber()

  await waitForPrChecks(prNumber)

  info(`Merging PR #${prNumber} (squash)...`)

  await capture([
    'gh', 'pr', 'merge', String(prNumber), '--squash',
  ])

  info(`PR #${prNumber} merged.`)

  await waitForMainBuild()

  info('Auto-merge complete.')
}

main()
