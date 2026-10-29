// End-to-end contract check against this project's local Docker stack.
// Creates an isolated user/device, checks the real mobile API client, then removes only its own fixtures.
const { execFileSync, spawnSync } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const path = require('node:path');
const id = `mobile_check_${randomUUID().replaceAll('-', '')}`;
const password = randomUUID();
function database(code) {
  const script = `const {pool}=require('./src/config/database'); const bcrypt=require('bcrypt');
    const id=${JSON.stringify(id)}, password=${JSON.stringify(password)};
    (async()=>{try { ${code} } finally { await pool.end(); }})().catch(e=>{console.error(e.message);process.exitCode=1;});`;
  return execFileSync('docker', ['exec', '-i', 'aquaponics-backend', 'node'], { input: script, encoding: 'utf8', timeout: 20000 });
}
let exitCode = 1;
try {
  database(`
    const hash=await bcrypt.hash(password,10);
    const connection=await pool.connect();
    try {
      await connection.query('BEGIN');
      const result=await connection.query('INSERT INTO users(login,password_hash) VALUES($1,$2) RETURNING user_id',[id,hash]);
      await connection.query('INSERT INTO devices(device_id,device_secret) VALUES($1,$2)',[id,hash]);
      await connection.query('INSERT INTO user_devices(user_id,device_id) VALUES($1,$2)',[result.rows[0].user_id,id]);
      for (const [table,value] of [['humidity',55],['temperature',24],['light',800]]) {
        await connection.query('INSERT INTO '+table+'(device_id,value) VALUES($1,$2)',[id,value]);
      }
      await connection.query('COMMIT');
    } catch(e) { await connection.query('ROLLBACK'); throw e; } finally { connection.release(); }
  `);
  const result = spawnSync(process.execPath, ['--test', path.join(__dirname, 'test-api.cjs')], {
    stdio: 'inherit', env: { ...process.env, TEST_API_URL: 'http://localhost:3000/api', TEST_LOGIN: id, TEST_PASSWORD: password, TEST_DEVICE_ID: id },
  });
  exitCode = result.status ?? 1;
} finally {
  try {
    const remaining = database(`
      await pool.query('DELETE FROM users WHERE login=$1',[id]);
      await pool.query('DELETE FROM devices WHERE device_id=$1',[id]);
      const result=await pool.query('SELECT (SELECT count(*) FROM users WHERE login=$1)+(SELECT count(*) FROM devices WHERE device_id=$1) AS remaining',[id]);
      console.log(result.rows[0].remaining);
    `).trim();
    if (remaining !== '0') throw new Error('Temporary fixtures still exist');
    console.log('Temporary test user, device and readings removed.');
  } catch (error) { console.error('Fixture cleanup failed:', error.message); exitCode = 1; }
}
process.exitCode = exitCode;
