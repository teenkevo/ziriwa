#!/usr/bin/env node
/**
 * Creates ORACLE_USER (default ziriwa) with DDL grants via SYSTEM (bootstrap).
 * Uses the same ORACLE_USER / ORACLE_PASSWORD as the app — one pair in .env for everything.
 *
 * Required: ORACLE_BOOTSTRAP_PASSWORD (SYSTEM password). ORACLE_PASSWORD required only while
 * the user does not exist yet (CREATE USER needs the new password).
 * Optional: ORACLE_BOOTSTRAP_USER (default system)
 *
 * Loads .env and .env.local.
 */
import oracledb from 'oracledb'
import { loadOracleEnvFiles } from './lib/load-env.mjs'

loadOracleEnvFiles()

function requireEnv(name) {
  const v = process.env[name]
  if (!v || !String(v).trim())
    throw new Error(`Missing environment variable: ${name}`)
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

/**
 * Oracle unquoted IDENTIFIED BY '...' is picky (ORA-00988 for many characters including '_').
 * Use double-quoted form — case-sensitive; escape " as "".
 * @see https://docs.oracle.com/en/database/oracle/oracle-database/23/sqlrf/CREATE-USER.html
 */
function identifiedByClause(password) {
  const inner = password.replace(/"/g, '""')
  return `IDENTIFIED BY "${inner}"`
}

/** Oracle Free / some PDBs have no USERS tablespace — use PDB defaults from the data dictionary. */
async function resolveAppTablespaces(conn) {
  const permRes = await conn.execute(
    `
      SELECT UPPER(TRIM(property_value)) AS "ts"
      FROM database_properties
      WHERE property_name = 'DEFAULT_PERMANENT_TABLESPACE'
    `,
  )
  let permanent = permRes.rows?.[0]?.ts
  const tempRes = await conn.execute(
    `
      SELECT UPPER(TRIM(property_value)) AS "ts"
      FROM database_properties
      WHERE property_name = 'DEFAULT_TEMP_TABLESPACE'
    `,
  )
  let temp = tempRes.rows?.[0]?.ts
  if (!permanent) {
    const fb = await conn.execute(
      `
        SELECT tablespace_name AS "ts"
        FROM dba_tablespaces
        WHERE contents = 'PERMANENT'
          AND status = 'ONLINE'
          AND tablespace_name NOT IN ('SYSTEM', 'SYSAUX')
        ORDER BY tablespace_name
        FETCH FIRST 1 ROWS ONLY
      `,
    )
    permanent = fb.rows?.[0]?.ts
  }
  if (!temp) {
    const tfb = await conn.execute(
      `
        SELECT tablespace_name AS "ts"
        FROM dba_tablespaces
        WHERE contents = 'TEMPORARY'
          AND status = 'ONLINE'
        ORDER BY tablespace_name
        FETCH FIRST 1 ROWS ONLY
      `,
    )
    temp = tfb.rows?.[0]?.ts ?? 'TEMP'
  }
  if (!permanent) {
    throw new Error(
      'Could not resolve a permanent tablespace (database_properties and dba_tablespaces).',
    )
  }
  return { permanent, temp }
}

const host = process.env.ORACLE_HOST?.trim() || 'localhost'
const port = Number(process.env.ORACLE_PORT?.trim() || '1521')
const bootstrapUser = process.env.ORACLE_BOOTSTRAP_USER?.trim() || 'system'
const bootstrapPassword = requireEnv('ORACLE_BOOTSTRAP_PASSWORD')
const appUserRaw = process.env.ORACLE_USER?.trim() || 'ziriwa'
const appUser = appUserRaw.toUpperCase()
const serviceName = process.env.ORACLE_SERVICE_NAME?.trim() || undefined
const sid = process.env.ORACLE_SID?.trim() || undefined

const connectString = buildConnectString({ host, port, serviceName, sid })

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT

const pool = await oracledb.createPool({
  user: bootstrapUser,
  password: bootstrapPassword,
  connectString,
  poolMin: 0,
  poolMax: 1,
})

const conn = await pool.getConnection()
try {
  const existsRes = await conn.execute(
    `SELECT COUNT(*) AS "c" FROM all_users WHERE username = :u`,
    { u: appUser },
  )
  const exists = Number(existsRes.rows?.[0]?.c ?? 0) > 0

  if (!exists) {
    const appPassword = requireEnv('ORACLE_PASSWORD')
    if (appPassword.length > 1024) {
      throw new Error(
        'ORACLE_PASSWORD is too long (max ~1024 for quoted Oracle passwords)',
      )
    }
    const { permanent, temp } = await resolveAppTablespaces(conn)
    const idBy = identifiedByClause(appPassword)
    const ddl =
      `CREATE USER ${appUser} ${idBy} ` +
      `DEFAULT TABLESPACE ${permanent} TEMPORARY TABLESPACE ${temp} ` +
      `QUOTA UNLIMITED ON ${permanent}`
    await conn.execute(ddl, [], { autoCommit: false })
    console.log(
      `Created user ${appUser} (default TS: ${permanent}, temp: ${temp}).`,
    )
  } else {
    console.log(`User ${appUser} already exists; applying grants only.`)
  }

  const grants = [
    'CREATE SESSION',
    'CREATE TABLE',
    'CREATE SEQUENCE',
    'CREATE VIEW',
    'CREATE PROCEDURE',
  ]
  for (const priv of grants) {
    await conn.execute(`GRANT ${priv} TO ${appUser}`, [], { autoCommit: false })
  }

  await conn.commit()
  console.log(
    `Done. Use ORACLE_USER=${appUserRaw} and ORACLE_PASSWORD with migrate, seed, and the app.`,
  )
} catch (e) {
  await conn.rollback()
  console.error(e)
  process.exitCode = 1
} finally {
  await conn.close()
  await pool.close(0)
}
