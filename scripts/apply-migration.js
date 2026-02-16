/**
 * Apply migration to Supabase database
 * Usage: node scripts/apply-migration.js
 */
const { Client } = require('pg');
const dns = require('dns');
const fs = require('fs');
const path = require('path');

// Force IPv6 resolution since Supabase DB only has AAAA records
dns.setDefaultResultOrder('verbatim');

// Connection via linked project (used for verification only)
const CONNECTION_STRING = process.env.DATABASE_URL || 'postgresql://postgres:aitEsvt1mV9Syssf@db.eryhwfkqbbuftepjvgwq.supabase.co:5432/postgres';

async function applyMigration() {
  const client = new Client({
    connectionString: CONNECTION_STRING,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully.');

    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260215000000_initial_schema.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Applying migration...');
    console.log(`Migration file: ${migrationPath}`);
    console.log(`SQL length: ${sql.length} characters`);

    await client.query(sql);

    console.log('\nMigration applied successfully!');

    // Verify tables were created
    const result = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    console.log('\nPublic tables created:');
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    // Verify indexes
    const indexResult = await client.query(`
      SELECT indexname, tablename
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname LIKE 'idx_%'
      ORDER BY tablename, indexname;
    `);

    console.log(`\nCustom indexes created: ${indexResult.rows.length}`);
    indexResult.rows.forEach(row => {
      console.log(`  - ${row.tablename}: ${row.indexname}`);
    });

    // Verify RLS is enabled
    const rlsResult = await client.query(`
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
        AND rowsecurity = true
      ORDER BY tablename;
    `);

    console.log(`\nTables with RLS enabled: ${rlsResult.rows.length}`);
    rlsResult.rows.forEach(row => {
      console.log(`  - ${row.tablename}`);
    });

    // Verify RLS policies
    const policyResult = await client.query(`
      SELECT tablename, policyname
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `);

    console.log(`\nRLS policies created: ${policyResult.rows.length}`);
    policyResult.rows.forEach(row => {
      console.log(`  - ${row.tablename}: ${row.policyname}`);
    });

    // Verify triggers
    const triggerResult = await client.query(`
      SELECT trigger_name, event_object_table, action_timing, event_manipulation
      FROM information_schema.triggers
      WHERE trigger_schema = 'public'
      ORDER BY event_object_table, trigger_name;
    `);

    console.log(`\nTriggers created: ${triggerResult.rows.length}`);
    triggerResult.rows.forEach(row => {
      console.log(`  - ${row.event_object_table}: ${row.trigger_name} (${row.action_timing} ${row.event_manipulation})`);
    });

    // Verify depots seed data
    const depotResult = await client.query('SELECT name, code FROM depots ORDER BY name;');
    console.log(`\nDepots seeded: ${depotResult.rows.length}`);
    depotResult.rows.forEach(row => {
      console.log(`  - ${row.name} (${row.code})`);
    });

  } catch (error) {
    console.error('\nMigration failed:', error.message);
    if (error.position) {
      console.error(`Error at position: ${error.position}`);
    }
    if (error.detail) {
      console.error(`Detail: ${error.detail}`);
    }
    process.exit(1);
  } finally {
    await client.end();
    console.log('\nDatabase connection closed.');
  }
}

applyMigration();
