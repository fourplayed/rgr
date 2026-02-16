/**
 * Verify database schema via Supabase REST API
 * Usage: node scripts/verify-schema.js
 */

const SUPABASE_URL = 'https://eryhwfkqbbuftepjvgwq.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyeWh3ZmtxYmJ1ZnRlcGp2Z3dxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwOTA4NjksImV4cCI6MjA4NjY2Njg2OX0.hFNt3C6MKjHzoFekIPSObddNJ-hNfJXfJWPn7Dbsw20';

async function verify() {
  console.log('Verifying database schema via REST API...\n');

  // Check OpenAPI spec to see which tables are exposed
  const specRes = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: {
      'apikey': ANON_KEY,
      'Accept': 'application/json',
    },
  });
  const spec = await specRes.json();
  const paths = Object.keys(spec.paths || {}).filter(p => p !== '/');
  console.log(`Tables exposed via PostgREST: ${paths.length}`);
  paths.forEach(p => console.log(`  - ${p.replace('/', '')}`));

  // Check definitions (table schemas)
  const definitions = Object.keys(spec.definitions || {});
  console.log(`\nTable definitions: ${definitions.length}`);
  definitions.forEach(d => console.log(`  - ${d}`));

  // Verify depots table has seed data
  console.log('\n--- Depot seed data ---');
  const depotRes = await fetch(`${SUPABASE_URL}/rest/v1/depots?select=name,code,is_active&order=name`, {
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
    },
  });

  if (depotRes.ok) {
    const depots = await depotRes.json();
    console.log(`Depots found: ${depots.length}`);
    depots.forEach(d => console.log(`  - ${d.name} (${d.code}) [active: ${d.is_active}]`));
  } else {
    const err = await depotRes.text();
    console.log(`Depots query response: ${depotRes.status} - ${err}`);
  }

  // Verify each table exists by querying with limit 0
  const tables = ['profiles', 'assets', 'scan_events', 'photos', 'freight_analysis', 'hazard_alerts', 'maintenance_records', 'audit_log'];

  console.log('\n--- Table existence check ---');
  for (const table of tables) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=0`, {
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Prefer': 'count=exact',
      },
    });

    const count = res.headers.get('content-range');
    if (res.ok) {
      console.log(`  [OK] ${table} (rows: ${count || '0'})`);
    } else {
      const err = await res.text();
      console.log(`  [!!] ${table}: ${res.status} - ${err.substring(0, 100)}`);
    }
  }

  // Verify storage buckets
  console.log('\n--- Storage bucket check ---');
  const bucketsRes = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    headers: {
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`,
    },
  });

  if (bucketsRes.ok) {
    const buckets = await bucketsRes.json();
    console.log(`Buckets found: ${buckets.length}`);
    buckets.forEach(b => console.log(`  - ${b.name} (public: ${b.public})`));
  } else {
    console.log(`Buckets query: ${bucketsRes.status}`);
  }

  console.log('\nSchema verification complete.');
}

verify().catch(err => {
  console.error('Verification failed:', err.message);
  process.exit(1);
});
