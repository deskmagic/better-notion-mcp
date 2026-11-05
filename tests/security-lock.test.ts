import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('security dependency lock', () => {
  it('keeps patched protocol, validation and HTTP dependencies in the frozen build', () => {
    const lock = readFileSync('bun.lock', 'utf8')
    // Check resolved entries, including transitive runtime and bundled build dependencies.
    const versions = Object.fromEntries(
      [...lock.matchAll(/^\s+"([^"]+)": \["[^"\n]+@(\d+\.\d+\.\d+)"/gm)].map((match) => [
        match[1],
        match[2].split('.').map(Number)
      ])
    )
    const floors: Record<string, number[]> = {
      '@modelcontextprotocol/sdk': [1, 32, 0],
      zod: [4, 6, 6],
      'proxy-addr': [2, 0, 8],
      'body-parser': [2, 4, 0],
      'fast-uri': [3, 1, 9],
      vite: [8, 3, 3],
      'source-map-js': [1, 2, 2]
    }
    Object.entries(floors).forEach(([name, floor]) => {
      expect(versions[name], name).toBeDefined()
      const firstDifference = versions[name].findIndex((value, index) => value !== floor[index])
      expect(firstDifference < 0 || versions[name][firstDifference] > floor[firstDifference], name).toBe(true)
    })
  })
})
