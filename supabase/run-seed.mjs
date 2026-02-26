import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://eryhwfkqbbuftepjvgwq.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.log('You can find it in: Supabase Dashboard > Project Settings > API > service_role key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const TrailerSubtypes = [
  'Flattop', 'Dropdeck', 'Ramp Trailer', 'Flattop Tautliner',
  'Mezdeck Tautliner', 'Extendable Flattop', 'Spreaddeck Ramp Trailer',
  '50t Float', '75t Float', '100t Float', 'Flattop A-Trailer',
  'Tautliner A-Trailer', 'Skel Trailer'
];

async function seed() {
  console.log('Starting seed...');

  // Get Perth depot ID
  const { data: depots, error: depotError } = await supabase
    .from('depots')
    .select('id')
    .eq('code', 'PER')
    .single();

  if (depotError) {
    console.error('Error fetching Perth depot:', depotError);
    process.exit(1);
  }

  const perthDepotId = depots.id;
  console.log('Perth depot ID:', perthDepotId);

  // Delete existing test data
  console.log('Deleting existing data...');
  await supabase.from('maintenance_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('scan_events').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('assets').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // Insert trailers
  console.log('Inserting trailers...');
  const trailers = [];
  for (let i = 1; i <= 20; i++) {
    const num = String(i).padStart(3, '0');
    const subtypeIndex = (i - 1) % TrailerSubtypes.length;
    const status = i === 3 || i === 10 || i === 16 ? 'maintenance' : (i === 7 || i === 20 ? 'out_of_service' : 'serviced');

    trailers.push({
      asset_number: `TL${num}`,
      category: 'trailer',
      subtype: TrailerSubtypes[subtypeIndex],
      status,
      make: ['Vawdrey', 'Maxitrans', 'Krueger', 'Freighter', 'Azmeb', 'Lucar'][i % 6],
      model: ['VB-S3', 'Freighter ST3', 'ST-3-OD', 'DD-45', 'ST-40', 'RFG-48'][i % 6],
      year_manufactured: 2018 + (i % 6),
      registration_number: `1TL${num}`,
      registration_expiry: '2026-12-31',
      assigned_depot_id: perthDepotId,
      last_latitude: -31.9505,
      last_longitude: 115.8605,
      last_location_updated_at: new Date(Date.now() - i * 3600000).toISOString(),
      qr_code_data: `RGR-TL${num}`,
      notes: `Trailer ${i} - ${TrailerSubtypes[subtypeIndex]}`
    });
  }

  const { data: insertedTrailers, error: trailerError } = await supabase
    .from('assets')
    .insert(trailers)
    .select();

  if (trailerError) {
    console.error('Error inserting trailers:', trailerError);
    process.exit(1);
  }
  console.log(`Inserted ${insertedTrailers.length} trailers`);

  // Insert dollies (no subtype)
  console.log('Inserting dollies...');
  const dollies = [];
  for (let i = 1; i <= 10; i++) {
    const num = String(i).padStart(3, '0');
    const status = i === 3 ? 'maintenance' : (i === 7 ? 'out_of_service' : 'serviced');

    dollies.push({
      asset_number: `DL${num}`,
      category: 'dolly',
      subtype: null,
      status,
      make: i % 2 === 0 ? 'Howard Porter' : 'Drake',
      model: i % 2 === 0 ? 'CD-2A' : 'RT-CV',
      year_manufactured: 2019 + (i % 5),
      registration_number: `1DL${num}`,
      registration_expiry: '2026-12-31',
      assigned_depot_id: perthDepotId,
      last_latitude: -31.9505,
      last_longitude: 115.8605,
      last_location_updated_at: new Date(Date.now() - i * 7200000).toISOString(),
      qr_code_data: `RGR-DL${num}`,
      notes: `Dolly ${i} - Converter`
    });
  }

  const { data: insertedDollies, error: dollyError } = await supabase
    .from('assets')
    .insert(dollies)
    .select();

  if (dollyError) {
    console.error('Error inserting dollies:', dollyError);
    process.exit(1);
  }
  console.log(`Inserted ${insertedDollies.length} dollies`);

  // Update QR codes to use rgr://asset/{id} format
  console.log('Updating QR codes...');
  const allAssets = [...insertedTrailers, ...insertedDollies];
  for (const asset of allAssets) {
    await supabase
      .from('assets')
      .update({
        qr_code_data: `rgr://asset/${asset.id}`,
        qr_generated_at: new Date().toISOString()
      })
      .eq('id', asset.id);
  }

  // Add some scan events for DL001
  console.log('Adding scan events...');
  const dl001 = insertedDollies.find(d => d.asset_number === 'DL001');
  if (dl001) {
    await supabase.from('scan_events').insert([
      {
        asset_id: dl001.id,
        scan_type: 'qr_scan',
        latitude: -31.9505,
        longitude: 115.8605,
        accuracy: 4.2,
        location_description: 'Perth Depot yard',
        device_info: '{"platform":"android","model":"Samsung Galaxy A54"}',
        raw_scan_data: `rgr://asset/${dl001.id}`,
        created_at: new Date(Date.now() - 3600000).toISOString()
      },
      {
        asset_id: dl001.id,
        scan_type: 'qr_scan',
        latitude: -31.9505,
        longitude: 115.8605,
        accuracy: 3.8,
        location_description: 'Perth Depot yard',
        device_info: '{"platform":"ios","model":"iPhone 15"}',
        raw_scan_data: `rgr://asset/${dl001.id}`,
        created_at: new Date(Date.now() - 86400000).toISOString()
      },
      {
        asset_id: dl001.id,
        scan_type: 'qr_scan',
        latitude: -31.9505,
        longitude: 115.8605,
        accuracy: 5.0,
        location_description: 'Perth Depot - loading bay',
        device_info: '{"platform":"android","model":"Pixel 8"}',
        raw_scan_data: `rgr://asset/${dl001.id}`,
        created_at: new Date(Date.now() - 172800000).toISOString()
      }
    ]);
    console.log('Added scan events for DL001');
  }

  console.log('Seed complete! 30 assets (20 trailers + 10 dollies) at Perth depot.');
}

seed().catch(console.error);
