import fs from 'node:fs'
import path from 'node:path'

/** Load .env then .env.local (same rule as Next.js). */
export function loadOracleEnvFiles() {
  loadEnvFile(path.join(process.cwd(), '.env'))
  loadEnvFile(path.join(process.cwd(), '.env.local'))
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return
  const content = fs.readFileSync(filePath, 'utf8')
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const rawValue = trimmed.slice(eqIdx + 1).trim()
    const value = rawValue.replace(/^['"]|['"]$/g, '')
    if (process.env[key] === undefined) process.env[key] = value
  }
}
