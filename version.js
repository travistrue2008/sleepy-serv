/*
 * This file acts like a polyfill for "npm version" since `bun` currently
 * doesn't have an equivalent.
 */

import original from './lib/package.json'

const contents = JSON.stringify({
  ...original,
  version: Bun.argv[2]
}, '', 2)

await Bun.write('./lib/package.json', contents)
