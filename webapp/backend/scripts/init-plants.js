const { pool } = require('../src/config/database');

(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS plants (
        id            TEXT PRIMARY KEY,
        name          TEXT NOT NULL,
        description   TEXT NOT NULL,
        contains      TEXT[] NOT NULL DEFAULT '{}',
        image         TEXT,
        is_preset     BOOLEAN DEFAULT FALSE,
        created_at    TIMESTAMP NOT NULL DEFAULT (NOW() AT TIME ZONE 'UTC')
      )
    `);
    console.log('Table plants created');

    await pool.query(`
      INSERT INTO plants (id, name, description, contains, is_preset) VALUES
        ('rukola', 'Руккола', 'Микрозелень рукколы — это суперфуд, который превосходит зрелую зелень по содержанию витаминов и антиоксидантов. Всего горсть таких ростков в день укрепляет здоровье, защищает от болезней и делает питание более полезным.', ARRAY['Витамины: С (укрепляет иммунитет), К (для костей и крови), А (для зрения и кожи), Фолаты (Б9)', 'Минералы: кальций, магний, железо, калий, йод'], TRUE),
        ('bazilik', 'Базилик', 'Микрозелень базилика — это не только вкусная, но и очень полезная добавка к рациону, которая укрепляет здоровье и обогащает питание ценными веществами.', ARRAY['Витамины: С, К, А, Е, группы В (Фолаты, рибофлавин)', 'Минералы: кальций, магний, железо, калий, цинк'], TRUE),
        ('redis', 'Редис', 'Микрозелень редиса – это маленькое чудо природы, которое дарит нам море здоровья, вкуса и радости!', ARRAY['С (аскорбиновая кислота) – укрепляет иммунитет, антиоксидант', 'А (бета-каротин) – полезен для зрения и кожи', 'К – важен для свертываемости крови и здоровья костей', 'Группа В (В6, В9 – фолаты) – поддерживают нервную систему'], TRUE)
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('Seed data inserted');

    await pool.query(`GRANT ALL PRIVILEGES ON TABLE plants TO aquaponics_app`);
    console.log('Grants applied');

    const { rows } = await pool.query('SELECT id, name, is_preset FROM plants');
    console.log('Plants in DB:', rows);

    await pool.end();
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
})();
