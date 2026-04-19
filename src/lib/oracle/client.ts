import 'server-only'

import oracledb from 'oracledb'

import { buildConnectString, getOracleEnv } from './config'

type SqlParams = Record<string, unknown> | undefined

// Default all executes to object rows.
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT
// Avoid streaming LOBs (CLOB columns) in app code.
oracledb.fetchAsString = [oracledb.CLOB]

declare global {
  // eslint-disable-next-line no-var
  var __ORACLE_POOL_PROMISE__: Promise<oracledb.Pool> | undefined
}

function getGlobalPoolPromise() {
  return globalThis.__ORACLE_POOL_PROMISE__
}

async function createGlobalPool(): Promise<oracledb.Pool> {
  const env = getOracleEnv()
  const connectString = buildConnectString(env)

  // Thin mode by default (no Oracle Instant Client needed).
  // `oracledb.createPool()` has callback + promise overloads; the TS typings
  // can surface an overload as `Promise<Pool> & void`. We only use the
  // promise form here.
  return oracledb.createPool({
    user: env.user,
    password: env.password,
    connectString,
    poolMin: 0,
    poolMax: 5,
    poolIncrement: 1,
  }) as unknown as Promise<oracledb.Pool>
}

export async function getOraclePool(): Promise<oracledb.Pool> {
  if (!getGlobalPoolPromise()) {
    globalThis.__ORACLE_POOL_PROMISE__ = createGlobalPool()
  }
  return globalThis.__ORACLE_POOL_PROMISE__!
}

export async function withOracleConnection<T>(
  fn: (conn: oracledb.Connection) => Promise<T>,
): Promise<T> {
  const pool = await getOraclePool()
  const conn = await pool.getConnection()
  try {
    return await fn(conn)
  } finally {
    await conn.close()
  }
}

export async function oracleQuery<T>(
  sql: string,
  binds?: SqlParams,
): Promise<T[]> {
  return withOracleConnection(async conn => {
    const res = await conn.execute(sql, (binds ?? {}) as any, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
    })
    return (res.rows as T[]) ?? []
  })
}

export async function oracleExecute(
  sql: string,
  binds?: SqlParams,
): Promise<void> {
  await withOracleConnection(async conn => {
    await conn.execute(sql, (binds ?? {}) as any, { autoCommit: true })
  })
}
