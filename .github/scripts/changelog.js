/*
 *  Reads and rewrites the root CHANGELOG.md around its `## [Unreleased]`
 *  section.
 *
 *  Usage:
 *    bun .github/scripts/changelog.js check
 *      Exits non-zero when the Unreleased section has no entries. Guards
 *      against cutting a release with nothing to say.
 *
 *    bun .github/scripts/changelog.js extract
 *      Prints the Unreleased body. Used for the GitHub Release notes.
 *
 *    bun .github/scripts/changelog.js promote <version> <date>
 *      Renames `## [Unreleased]` to `## [<version>] - <date>`, inserts a fresh
 *      empty Unreleased above it, and refreshes the comparison links.
 */

const REPO = 'https://github.com/travistrue2008/sleepy-serv'
const PATH = 'CHANGELOG.md'
const UNRELEASED = '## [Unreleased]'

function readSections (text) {
  const start = text.indexOf(UNRELEASED)

  if (start === -1) {
    throw new Error(`${PATH} has no "${UNRELEASED}" heading`)
  }

  const afterHeading = start + UNRELEASED.length
  const next = text.indexOf('\n## ', afterHeading)
  const end = next === -1 ? text.length : next

  return {
    head: text.slice(0, start),
    body: text.slice(afterHeading, end).trim(),
    tail: text.slice(end),
  }
}

function previousVersion (tail) {
  return tail.match(/^\n## \[([^\]]+)\]/)?.[1] ?? null
}

function check (text) {
  const { body } = readSections(text)

  if (!body) {
    console.error(
      `${PATH} has an empty "${UNRELEASED}" section. `
      + 'Add entries describing this release before publishing.',
    )

    process.exit(1)
  }

  console.info(`${PATH}: Unreleased section has content`)
  process.exit(0)
}

function extract (text) {
  const { body } = readSections(text)

  console.log(body)
  process.exit(0)
}

async function promote (text, version, date) {
  const { head, body, tail } = readSections(text)

  if (!version || !date) {
    console.error('Usage: changelog.js promote <version> <date>')
    process.exit(1)
  }

  const previous = previousVersion(tail)

  // Drop the old Unreleased link definition; a fresh one is appended below.
  const trimmedTail = tail.replace(
    /^\[Unreleased\]:.*$\n?/m,
    '',
  ).trimEnd()

  const compare = previous
    ? `${REPO}/compare/${previous}...${version}`
    : `${REPO}/releases/tag/${version}`

  const next = [
    head + UNRELEASED,
    '',
    `## [${version}] - ${date}`,
    '',
    body,
    trimmedTail,
    `[Unreleased]: ${REPO}/compare/${version}...HEAD`,
    `[${version}]: ${compare}`,
    '',
  ].join('\n')

  await Bun.write(PATH, next)

  console.info(`${PATH}: promoted Unreleased to ${version} (${date})`)
  process.exit(0)
}

async function main () {
  const [command, version, date] = Bun.argv.slice(2)
  const text = await Bun.file(PATH).text()

  switch (command) {
    case 'check':
      check(text)
      break

    case 'extract':
      extract(text)
      break

    case 'promote':
      await promote(text, version, date)
      break

    default:
      console.error('Usage: changelog.js <check|extract|promote>')
      process.exit(1)
      break
  }
}

main()
