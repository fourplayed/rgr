const { Client } = require('pg');
const fs = require('fs');

// Try different connection formats
const configs = [
  {
    name: 'Pooler (transaction)',
    connectionString: 'postgresql://postgres.eryhwfkqbbuftepjvgwq:K5EeQIRX8838fvzP@aws-0-ap-south-1.pooler.supabase.com:6543/postgres'
  },
  {
    name: 'Pooler (session)', 
    connectionString: 'postgresql://postgres.eryhwfkqbbuftepjvgwq:K5EeQIRX8838fvzP@aws-0-ap-south-1.pooler.supabase.com:5432/postgres'
  }
];

async function tryConnect(config) {
  const client = new Client({
    connectionString: config.connectionString,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    console.log(`Trying ${config.name}...`);
    await client.connect();
    console.log('Connected!');
    return client;
  } catch (err) {
    console.log(`Failed: ${err.message}`);
    return null;
  }
}

async function run() {
  let client = null;
  
  for (const config of configs) {
    client = await tryConnect(config);
    if (client) break;
  }
  
  if (!client) {
    console.error('Could not connect to database with any configuration');
    return;
  }

  try {
    console.log('Deleting existing data...');
    await client.query('DELETE FROM maintenance_records');
    await client.query('DELETE FROM scan_events'); 
    await client.query('DELETE FROM assets');
    console.log('Existing data deleted.');

    console.log('Running seed.sql...');
    const seedSql = fs.readFileSync('./supabase/seed.sql', 'utf8');
    await client.query(seedSql);
    console.log('Seed complete! 30 assets created at Perth depot.');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

run();
