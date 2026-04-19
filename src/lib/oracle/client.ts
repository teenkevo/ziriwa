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

async function resetGlobalPool(): Promise<void> {
  const p = getGlobalPoolPromise()
  globalThis.__ORACLE_POOL_PROMISE__ = undefined
  try {
    const pool = await p
    await pool?.close(0)
  } catch {
    // best-effort: pool may be half-initialized or already closed
  }
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
    // Work around sporadic Thin-driver buffer errors by disabling
    // the statement cache (observed as ERR_BUFFER_OUT_OF_BOUNDS in dev).
    stmtCacheSize: 0,
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
  const run = () =>
    withOracleConnection(async conn => {
      const res = await conn.execute(sql, (binds ?? {}) as any, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
      })
      return (res.rows as T[]) ?? []
    })

  try {
    return await run()
  } catch (err) {
    const code =
      err && typeof err === 'object' && 'code' in err
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (err as any).code
        : undefined

    if (code === 'ERR_BUFFER_OUT_OF_BOUNDS') {
      await resetGlobalPool()
      return await run()
    }
    throw err
  }
}

export async function oracleExecute(
  sql: string,
  binds?: SqlParams,
): Promise<void> {
  await withOracleConnection(async conn => {
    await conn.execute(sql, (binds ?? {}) as any, { autoCommit: true })
  })
}
