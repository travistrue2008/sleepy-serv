const BOLD = '\x1b[1m'
const RED = '\x1b[31m'
const GREEN = '\x1b[32m'
const RESET = '\x1b[0m'

function info (msg) {
  console.log(`${GREEN}[sync]${RESET} ${msg}`)
}

function fail (msg) {
  console.error(`${RED}${BOLD}[sync] Error:${RESET} ${msg}`)
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
  const shouldCommit = Bun.argv.includes('--commit')
  const branch = await capture(['git', 'rev-parse', '--abbrev-ref', 'HEAD'])

  if (shouldCommit) {
    const status = await capture(['git', 'status', '--porcelain'])

    if (status) {
      info('Staging, committing, and pushing changes...')

      await run(['git', 'add', '-A'])
      await run(['git', 'commit', '-m', 'Implemented'])
      await run(['git', 'push', 'origin', branch])
    } else {
      info('Nothing to commit.')
    }
  } else {
    const status = await capture(['git', 'status', '--porcelain'])

    if (status) {
      /* eslint-disable max-len */
      fail(`
Working tree is not clean. Commit or discard all changes before running the /pr skill.

${status}
      `.trim())
      /* eslint-enable max-len */
    }
  }

  if (branch === 'main') {
    fail('Cannot run the pr skill from the main branch.')
  }

  info(`Current branch: ${branch}`)

  info('Switching to main and pulling latest...')
  await run(['git', 'checkout', 'main'])
  await run(['git', 'pull', 'origin', 'main'])

  info(`Switching back to ${branch} and merging main...`)
  await run(['git', 'checkout', branch])

  const merge = Bun.spawn(
    ['git', 'merge', 'main'],
    {
      stdout: 'inherit',
      stderr: 'inherit',
    },
  )

  const mergeCode = await merge.exited

  if (mergeCode !== 0) {
    const conflictCheck = await capture([
      'git', 'diff', '--name-only', '--diff-filter=U',
    ])

    if (conflictCheck) {
      await run(['git', 'merge', '--abort'])

      fail(
        'Merge conflicts detected. Resolve them manually '
        + 'before running the pr skill.\n\n'
        + 'Conflicting files:\n'
        + conflictCheck,
      )
    }

    fail(`Merge failed with exit code ${mergeCode}`)
  }

  info('Pushing branch...')
  await run(['git', 'push', 'origin', branch])

  info('Branch synced successfully.')
}

main()
