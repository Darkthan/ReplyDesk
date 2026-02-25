const { readFileSync } = require('fs');
const { join } = require('path');
const { Client } = require('pg');

async function migrate() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'emailauto',
    user: process.env.DB_USER || 'emailauto',
    password: process.env.DB_PASSWORD || 'devpassword',
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const sql = readFileSync(
      join(__dirname, '..', 'server', 'src', 'db', 'migrations', '001_create_tables.sql'),
      'utf-8'
    );

    await client.query(sql);
    console.log('Migration executed successfully');
  } catch (err) {
    if (err.message && err.message.includes('already exists')) {
      console.log('Tables already exist, skipping migration');
    } else {
      console.error('Migration failed:', err.message);
      process.exit(1);
    }
  } finally {
    await client.end();
  }
}

migrate();
