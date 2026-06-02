const { pool } = require('../src/config/database');

(async () => {
  try {
    const { rows } = await pool.query(
      "SELECT schemaname, tablename, tableowner FROM pg_tables WHERE tablename = 'plants'"
    );
    console.log(rows);
    await pool.end();
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
})();
