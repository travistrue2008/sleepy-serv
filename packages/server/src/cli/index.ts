#!/usr/bin/env bun

import { parseArgs } from 'node:util'
import { init } from './init'
import { dev } from './dev'
import { build } from './build'

const USAGE = `
Usage: sleepy <command>

Commands:
  init    Create a new sleepy-serv project
  dev     Start the dev server (watch mode)
  build   Build for production

Options:
  --help  Show this help message
`.trim().concat('\n')

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    help: {
      type: 'boolean',
      short: 'h',
    },
  },
})

if (values.help) {
  console.log(USAGE)
  process.exit(0)
}

const command = positionals[0]

switch (command) {
  case 'init':
    await init()
    break

  case 'dev':
    await dev()
    break

  case 'build':
    await build()
    break

  default:
    console.error(USAGE)
    process.exit(1)
}
