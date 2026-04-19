import 'server-only'

type OracleEnv = {
  host: string
  port: number
  user: string
  password: string
  serviceName?: string
  sid?: string
}

function env(name: string): string {
  const v = process.env[name]
  if (!v || !v.trim()) {
    throw new Error(`Missing environment variable: ${name}`)
  }
  return v.trim()
}

export function getOracleEnv(): OracleEnv {
  const host = process.env.ORACLE_HOST?.trim() || 'localhost'
  const port = Number(process.env.ORACLE_PORT?.trim() || '1521')
  const user = process.env.ORACLE_USER?.trim() || 'ziriwa'
  const password = env('ORACLE_PASSWORD')

  const serviceName = process.env.ORACLE_SERVICE_NAME?.trim() || undefined
  const sid = process.env.ORACLE_SID?.trim() || undefined

  return { host, port, user, password, serviceName, sid }
}

export function buildConnectString(env: OracleEnv): string {
  const { host, port, serviceName, sid } = env

  if (serviceName) {
    // Oracle service name (recommended)
    return `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=${host})(PORT=${port}))(CONNECT_DATA=(SERVICE_NAME=${serviceName})))`
  }

  if (sid) {
    // Fallback to SID
    return `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=${host})(PORT=${port}))(CONNECT_DATA=(SID=${sid})))`
  }

  throw new Error('Missing ORACLE_SERVICE_NAME or ORACLE_SID')
}
