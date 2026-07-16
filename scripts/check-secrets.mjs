#!/usr/bin/env node

import { execFileSync } from 'node:child_process'
import { readFileSync, statSync } from 'node:fs'

const files = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean)

const excluded = (path) =>
  path === 'package-lock.json' ||
  path.includes('__tests__/') ||
  path.includes('__snapshots__/')

const rules = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['GitHub token', /\b(?:ghp|github_pat)_[A-Za-z0-9_]{20,}\b/],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['Slack token', /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/],
  ['JWT', /\beyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/],
  ['password in checkpoint', /\|\s*\*\*(?:DB password|Admin user)\*\*\s*\|\s*`(?!<)[^`]+`/i],
  ['default script password', /getArg\(\s*['"]password['"]\s*,\s*['"][^'"]+['"]\s*\)/],
]

const findings = []
for (const path of files) {
  if (excluded(path) || statSync(path).size > 1_000_000) continue
  const buffer = readFileSync(path)
  if (buffer.includes(0)) continue
  const content = buffer.toString('utf8')
  for (const [name, pattern] of rules) {
    if (pattern.test(content)) findings.push(`${path}: posible ${name}`)
  }
}

if (findings.length > 0) {
  console.error('Se han detectado posibles secretos:')
  findings.forEach((finding) => console.error(`- ${finding}`))
  process.exit(1)
}

console.log('No se han detectado secretos de alta confianza.')
