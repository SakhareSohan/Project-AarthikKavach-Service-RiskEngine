const { Client } = require('pg');
const { ServerConfig } = require('../config');

async function listTables() {
    const client = new Client({
        user: ServerConfig.DB_USERNAME,
        host: ServerConfig.DB_HOST,
        database: ServerConfig.DB_DATABASE,
        password: ServerConfig.DB_PASSWORD,
        port: ServerConfig.DB_PORT,
        ssl: { rejectUnauthorized: false } // Often needed for cloud DBs
    });

    try {
        await client.connect();
        const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
        console.log('Tables in DB:', res.rows.map(r => r.table_name));
    } catch (err) {
        console.error('Error listing tables:', err);
    } finally {
        await client.end();
    }
}

listTables();
