export async function assertDiskHeadroom(pool, { tableName }) {
  const SAFETY_LIMIT_BYTES = 4.0 * Math.pow(1024, 3); // 4 GB
  const dbSizeRes = await pool.query(`SELECT pg_database_size(current_database()) AS bytes, pg_size_pretty(pg_database_size(current_database())) AS size`);
  
  let tableSizeStr = 'unknown';
  if (tableName) {
    try {
      const tableSizeRes = await pool.query(`SELECT pg_size_pretty(pg_total_relation_size('${tableName}')) AS size`);
      if (tableSizeRes.rows.length) {
        tableSizeStr = tableSizeRes.rows[0].size;
      }
    } catch (e) {
      // ignore
    }
  }
  
  const bytes = Number(dbSizeRes.rows[0].bytes);
  const sizePretty = dbSizeRes.rows[0].size;
  
  if (bytes > SAFETY_LIMIT_BYTES) {
    console.error(`[db-space] WARNING: Database size is dangerously high (${sizePretty} / 4.0 GB safe limit). Aborting writes!`);
    throw new Error('Database volume capacity limit reached (safety abort)');
  }
  
  return { bytes, sizePretty, tableSizeStr, limitBytes: SAFETY_LIMIT_BYTES };
}
