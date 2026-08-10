/* See .claude/kbase/style/typescript.md */

declare module 'bun:test' {
  interface Matchers<T = unknown> {
    toHaveBeenCalledOnce(): void
  }
}

export {}
