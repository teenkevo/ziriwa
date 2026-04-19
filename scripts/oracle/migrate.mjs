/**
 * Applies ordered DDL from scripts/oracle/migrations/*.sql (prefix NNN_).
 * Records each applied file in schema_migrations (in the connected user's schema).
 *
 * Run as the application user (e.g. ziriwa), not SYSTEM — objects belong in that schema.
 * First-time DB setup (set ORACLE_USER / ORACLE_PASSWORD in .env first, then):
 *   1. npm run oracle:create-user  (or admin/create_app_user.sql as SYSTEM)
 *   2. npm run oracle:migrate
 */
import fs from 'node:fs'
import path from 'node:path'

import oracledb from 'oracledb'

import { loadOracleEnvFiles } from './lib/load-env.mjs'

loadOracleEnvFiles()

function requireEnv(name) {
  const v = process.env[name]
  if (!v || !String(v).trim()) {
    throw new Error(`Missing environment variable: ${name}`)
  }
  return String(v).trim()
}

function buildConnectString({ host, port, serviceName, sid }) {
  if (serviceName) {
    return `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=${host})(PORT=${port}))(CONNECT_DATA=(SERVICE_NAME=${serviceName})))`
  }
  if (sid) {
    return `(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=${host})(PORT=${port}))(CONNECT_DATA=(SID=${sid})))`
  }
  throw new Error('Missing ORACLE_SERVICE_NAME or ORACLE_SID')
}

const env = {
  host: process.env.ORACLE_HOST?.trim() || 'localhost',
  port: Number(process.env.ORACLE_PORT?.trim() || '1521'),
  user: process.env.ORACLE_USER?.trim() || 'ziriwa',
  password: requireEnv('ORACLE_PASSWORD'),
  serviceName: process.env.ORACLE_SERVICE_NAME?.trim() || undefined,
  sid: process.env.ORACLE_SID?.trim() || undefined,
}

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT

const pool = await oracledb.createPool({
  user: env.user,
  password: env.password,
  connectString: buildConnectString(env),
  poolMin: 0,
  poolMax: 1,
})

function splitSqlFile(sql) {
  const lines = sql.split('\n')
  let buf = ''
  const slashBlocks = []
  for (const line of lines) {
    if (line.trim() === '/') {
      const chunk = buf.trim()
      if (chunk) slashBlocks.push(chunk)
      buf = ''
      continue
    }
    buf += `${line}\n`
  }
  const remainder = buf.trim()
  const statements = remainder
    ? remainder
        .split(';')
        .map(s => s.trim())
        .filter(Boolean)
    : []
  return { slashBlocks, statements }
}

const conn = await pool.getConnection()
try {
  await conn.execute(
    `
      BEGIN
        EXECUTE IMMEDIATE 'CREATE TABLE schema_migrations (
          filename   VARCHAR2(255) PRIMARY KEY,
          applied_at TIMESTAMP DEFAULT SYSTIMESTAMP
        )';
      EXCEPTION
        WHEN OTHERS THEN
          IF SQLCODE = -955 THEN NULL; ELSE RAISE; END IF;
      END;
    `,
    [],
    { autoCommit: true },
  )

  const migrationsDir = path.join(
    process.cwd(),
    'scripts',
    'oracle',
    'migrations',
  )
  const files = fs
    .readdirSync(migrationsDir)
    .filter(f => /^\d+_.*\.sql$/i.test(f))
    .sort()

  if (files.length === 0) {
    console.warn('No migration files matched scripts/oracle/migrations/NNN_*.sql')
  }

  for (const file of files) {
    const alreadyRes = await conn.execute(
      `SELECT COUNT(*) AS "c" FROM schema_migrations WHERE filename = :f`,
      { f: file },
      { outFormat: oracledb.OUT_FORMAT_OBJECT },
    )
    const already = Number(alreadyRes.rows?.[0]?.c ?? 0) > 0
    if (already) continue

    const sqlPath = path.join(migrationsDir, file)
    const sql = fs.readFileSync(sqlPath, 'utf8')
    const { slashBlocks, statements } = splitSqlFile(sql)

    for (const chunk of slashBlocks) {
      await conn.execute(chunk, [], { autoCommit: true })
    }

    for (const stmt of statements) {
      await conn.execute(`${stmt};`, [], { autoCommit: true })
    }

    await conn.execute(
      `INSERT INTO schema_migrations (filename) VALUES (:f)`,
      { f: file },
      { autoCommit: true },
    )
  }

  console.log('Oracle schema migrations applied.')
} finally {
  await conn.close()
  await pool.close(0)
}
