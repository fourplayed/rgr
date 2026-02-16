-- ============================================================================
-- RGR Fleet Manager — Test Seed Data
-- Run via: Supabase SQL Editor or `psql -f supabase/seed.sql`
--
-- Prerequisites:
--   - 20260215000000_initial_schema.sql has been applied
--   - 20260216000000_rename_active_to_serviced.sql has been applied
--   - Depots are already seeded in initial migration
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Fetch depot IDs for FK references
-- ────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  d_per UUID; d_kal UUID; d_ger UUID; d_phd UUID;
  d_kar UUID; d_bun UUID; d_alb UUID; d_esp UUID;

  -- asset IDs (we'll store them for scan_events + maintenance)
  a01 UUID; a02 UUID; a03 UUID; a04 UUID; a05 UUID;
  a06 UUID; a07 UUID; a08 UUID; a09 UUID; a10 UUID;
  a11 UUID; a12 UUID; a13 UUID; a14 UUID; a15 UUID;
  a16 UUID; a17 UUID; a18 UUID; a19 UUID; a20 UUID;
  a21 UUID; a22 UUID; a23 UUID; a24 UUID; a25 UUID;
  a26 UUID; a27 UUID; a28 UUID; a29 UUID; a30 UUID;

BEGIN
  -- Grab depot UUIDs
  SELECT id INTO d_per FROM depots WHERE code = 'PER';
  SELECT id INTO d_kal FROM depots WHERE code = 'KAL';
  SELECT id INTO d_ger FROM depots WHERE code = 'GER';
  SELECT id INTO d_phd FROM depots WHERE code = 'PHD';
  SELECT id INTO d_kar FROM depots WHERE code = 'KAR';
  SELECT id INTO d_bun FROM depots WHERE code = 'BUN';
  SELECT id INTO d_alb FROM depots WHERE code = 'ALB';
  SELECT id INTO d_esp FROM depots WHERE code = 'ESP';

  -- ──────────────────────────────────────────────────────────────────────────
  -- 2. ASSETS — 20 Trailers + 10 Dollies across all depots
  -- ──────────────────────────────────────────────────────────────────────────

  -- Perth trailers
  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('TL001', 'trailer', 'flatbed', 'serviced', 'Vawdrey', 'VB-S3', 2022, '1TQR987', '2026-08-15', d_per, -31.9505, 115.8605, NOW() - INTERVAL '2 hours', 'RGR-TL001', 'Primary Perth metro run')
  RETURNING id INTO a01;

  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('TL002', 'trailer', 'curtainsider', 'serviced', 'Maxitrans', 'Freighter ST3', 2021, '1TQR654', '2026-11-30', d_per, -31.8868, 115.8613, NOW() - INTERVAL '5 hours', 'RGR-TL002', 'General freight — Welshpool')
  RETURNING id INTO a02;

  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('TL003', 'trailer', 'refrigerated', 'maintenance', 'Lucar', 'RFG-48', 2020, '1TQR321', '2026-03-01', d_per, -31.9523, 115.8613, NOW() - INTERVAL '3 days', 'RGR-TL003', 'Reefer — compressor issue reported')
  RETURNING id INTO a03;

  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('TL004', 'trailer', 'flatbed', 'serviced', 'Krueger', 'ST-3-OD', 2023, '1TQR111', '2027-02-28', d_per, -31.7920, 115.8881, NOW() - INTERVAL '1 day', 'RGR-TL004', 'Oversize load certified')
  RETURNING id INTO a04;

  -- Karratha trailers
  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('TL005', 'trailer', 'flatbed', 'serviced', 'Vawdrey', 'VB-S3', 2021, '1KAR501', '2026-09-15', d_kar, -20.7364, 116.8463, NOW() - INTERVAL '6 hours', 'RGR-TL005', 'Karratha iron ore run')
  RETURNING id INTO a05;

  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('TL006', 'trailer', 'drop-deck', 'serviced', 'Freighter', 'DD-45', 2022, '1KAR502', '2026-12-01', d_kar, -20.7500, 116.8300, NOW() - INTERVAL '12 hours', 'RGR-TL006', 'Heavy haulage — Pilbara')
  RETURNING id INTO a06;

  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('TL007', 'trailer', 'curtainsider', 'out_of_service', 'Maxitrans', 'Freighter ST3', 2018, '1KAR503', '2025-06-30', d_kar, -20.7400, 116.8500, NOW() - INTERVAL '30 days', 'RGR-TL007', 'Decommission pending — frame damage')
  RETURNING id INTO a07;

  -- Port Hedland trailers
  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('TL008', 'trailer', 'side-tipper', 'serviced', 'Azmeb', 'ST-40', 2023, '1PHD801', '2027-01-15', d_phd, -20.3106, 118.5753, NOW() - INTERVAL '4 hours', 'RGR-TL008', 'Ore haulage — BHP contract')
  RETURNING id INTO a08;

  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('TL009', 'trailer', 'side-tipper', 'serviced', 'Azmeb', 'ST-40', 2023, '1PHD802', '2027-01-15', d_phd, -20.3200, 118.5600, NOW() - INTERVAL '8 hours', 'RGR-TL009', 'Ore haulage — FMG contract')
  RETURNING id INTO a09;

  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('TL010', 'trailer', 'flatbed', 'maintenance', 'Krueger', 'ST-3-OD', 2020, '1PHD803', '2026-04-10', d_phd, -20.3050, 118.5800, NOW() - INTERVAL '7 days', 'RGR-TL010', 'Tyre replacement scheduled')
  RETURNING id INTO a10;

  -- Kalgoorlie trailers
  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('TL011', 'trailer', 'flatbed', 'serviced', 'Vawdrey', 'VB-S2', 2021, '1KAL111', '2026-10-20', d_kal, -30.7489, 121.4660, NOW() - INTERVAL '1 hour', 'RGR-TL011', 'Goldfields freight')
  RETURNING id INTO a11;

  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('TL012', 'trailer', 'curtainsider', 'serviced', 'Maxitrans', 'Tautliner', 2022, '1KAL112', '2026-07-15', d_kal, -30.7600, 121.4500, NOW() - INTERVAL '3 hours', 'RGR-TL012', 'Retail deliveries — Kalgoorlie CBD')
  RETURNING id INTO a12;

  -- Geraldton trailers
  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('TL013', 'trailer', 'refrigerated', 'serviced', 'Lucar', 'RFG-48', 2022, '1GER131', '2026-06-30', d_ger, -28.7745, 114.6150, NOW() - INTERVAL '10 hours', 'RGR-TL013', 'Seafood — Geraldton to Perth')
  RETURNING id INTO a13;

  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('TL014', 'trailer', 'flatbed', 'serviced', 'Freighter', 'FB-ST', 2019, '1GER132', '2026-05-01', d_ger, -28.7800, 114.6200, NOW() - INTERVAL '2 days', 'RGR-TL014', 'Mid-west grain run')
  RETURNING id INTO a14;

  -- Bunbury trailers
  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('TL015', 'trailer', 'curtainsider', 'serviced', 'Vawdrey', 'VB-CS3', 2023, '1BUN151', '2027-03-15', d_bun, -33.3271, 115.6414, NOW() - INTERVAL '5 hours', 'RGR-TL015', 'South-west timber')
  RETURNING id INTO a15;

  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('TL016', 'trailer', 'refrigerated', 'maintenance', 'Lucar', 'RFG-40', 2019, '1BUN152', '2026-02-28', d_bun, -33.3300, 115.6500, NOW() - INTERVAL '14 days', 'RGR-TL016', 'Reefer unit overhaul')
  RETURNING id INTO a16;

  -- Albany trailers
  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('TL017', 'trailer', 'flatbed', 'serviced', 'Krueger', 'FB-2A', 2021, '1ALB171', '2026-09-30', d_alb, -35.0269, 117.8837, NOW() - INTERVAL '1 day', 'RGR-TL017', 'Great Southern grain')
  RETURNING id INTO a17;

  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('TL018', 'trailer', 'curtainsider', 'serviced', 'Maxitrans', 'Tautliner', 2020, '1ALB172', '2026-08-01', d_alb, -35.0300, 117.8900, NOW() - INTERVAL '18 hours', 'RGR-TL018', 'Albany port freight')
  RETURNING id INTO a18;

  -- Esperance trailers
  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('TL019', 'trailer', 'side-tipper', 'serviced', 'Azmeb', 'ST-35', 2022, '1ESP191', '2026-11-15', d_esp, -33.8614, 121.8919, NOW() - INTERVAL '6 hours', 'RGR-TL019', 'Nickel ore — Norseman')
  RETURNING id INTO a19;

  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('TL020', 'trailer', 'flatbed', 'out_of_service', 'Vawdrey', 'VB-S2', 2017, '1ESP192', '2025-01-31', d_esp, -33.8700, 121.9000, NOW() - INTERVAL '60 days', 'RGR-TL020', 'Retired — structural fatigue')
  RETURNING id INTO a20;

  -- ── DOLLIES ──

  -- Perth dollies
  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('DL001', 'dolly', 'converter', 'serviced', 'Howard Porter', 'CD-2A', 2022, '1DPR001', '2026-10-15', d_per, -31.9480, 115.8590, NOW() - INTERVAL '3 hours', 'RGR-DL001', 'B-double converter — Perth')
  RETURNING id INTO a21;

  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('DL002', 'dolly', 'converter', 'serviced', 'Howard Porter', 'CD-2A', 2021, '1DPR002', '2026-07-20', d_per, -31.9510, 115.8620, NOW() - INTERVAL '1 day', 'RGR-DL002', 'Road-train converter — Perth')
  RETURNING id INTO a22;

  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('DL003', 'dolly', 'converter', 'maintenance', 'Drake', 'RT-CV', 2019, '1DPR003', '2026-04-01', d_per, -31.9530, 115.8640, NOW() - INTERVAL '5 days', 'RGR-DL003', 'Turntable bearing replacement')
  RETURNING id INTO a23;

  -- Karratha dollies
  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('DL004', 'dolly', 'converter', 'serviced', 'Howard Porter', 'CD-3A', 2023, '1DKR004', '2027-01-30', d_kar, -20.7380, 116.8480, NOW() - INTERVAL '8 hours', 'RGR-DL004', 'Triple road-train converter')
  RETURNING id INTO a24;

  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('DL005', 'dolly', 'converter', 'serviced', 'Drake', 'RT-CV', 2022, '1DKR005', '2026-08-15', d_kar, -20.7350, 116.8450, NOW() - INTERVAL '4 hours', 'RGR-DL005', 'Pilbara mine haul')
  RETURNING id INTO a25;

  -- Port Hedland dollies
  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('DL006', 'dolly', 'converter', 'serviced', 'Howard Porter', 'CD-3A', 2023, '1DPH006', '2027-02-28', d_phd, -20.3120, 118.5770, NOW() - INTERVAL '2 hours', 'RGR-DL006', 'BHP quad road-train')
  RETURNING id INTO a26;

  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('DL007', 'dolly', 'converter', 'out_of_service', 'Drake', 'RT-CV', 2017, '1DPH007', '2025-03-15', d_phd, -20.3080, 118.5730, NOW() - INTERVAL '45 days', 'RGR-DL007', 'Cracked A-frame — written off')
  RETURNING id INTO a27;

  -- Kalgoorlie dolly
  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('DL008', 'dolly', 'converter', 'serviced', 'Howard Porter', 'CD-2A', 2022, '1DKL008', '2026-12-01', d_kal, -30.7500, 121.4680, NOW() - INTERVAL '6 hours', 'RGR-DL008', 'Goldfields road-train')
  RETURNING id INTO a28;

  -- Geraldton dolly
  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('DL009', 'dolly', 'converter', 'serviced', 'Drake', 'RT-CV', 2021, '1DGR009', '2026-06-15', d_ger, -28.7760, 114.6170, NOW() - INTERVAL '12 hours', 'RGR-DL009', 'Mid-west freight')
  RETURNING id INTO a29;

  -- Bunbury dolly
  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('DL010', 'dolly', 'converter', 'serviced', 'Howard Porter', 'CD-2A', 2020, '1DBN010', '2026-05-30', d_bun, -33.3280, 115.6430, NOW() - INTERVAL '2 days', 'RGR-DL010', 'South-west B-double')
  RETURNING id INTO a30;

  -- ──────────────────────────────────────────────────────────────────────────
  -- 3. SCAN EVENTS — recent scan history for assets
  --    (no scanned_by since we don't have test user profiles yet)
  -- ──────────────────────────────────────────────────────────────────────────

  -- TL001 — scanned multiple times recently
  INSERT INTO scan_events (asset_id, scan_type, latitude, longitude, accuracy, speed, location_description, device_info, raw_scan_data, created_at)
  VALUES
    (a01, 'qr_scan', -31.9505, 115.8605, 4.2, 0, 'Perth Depot yard', '{"platform":"android","model":"Samsung Galaxy A54"}', 'RGR-TL001', NOW() - INTERVAL '2 hours'),
    (a01, 'qr_scan', -31.8100, 115.8900, 6.1, 72, 'Great Eastern Hwy — Midland', '{"platform":"android","model":"Samsung Galaxy A54"}', 'RGR-TL001', NOW() - INTERVAL '26 hours'),
    (a01, 'qr_scan', -31.9505, 115.8605, 3.8, 0, 'Perth Depot yard', '{"platform":"ios","model":"iPhone 15"}', 'RGR-TL001', NOW() - INTERVAL '50 hours');

  -- TL002
  INSERT INTO scan_events (asset_id, scan_type, latitude, longitude, accuracy, location_description, device_info, raw_scan_data, created_at)
  VALUES
    (a02, 'qr_scan', -31.8868, 115.8613, 5.0, 'Welshpool loading dock', '{"platform":"android","model":"Pixel 8"}', 'RGR-TL002', NOW() - INTERVAL '5 hours'),
    (a02, 'qr_scan', -31.9505, 115.8605, 4.5, 'Perth Depot yard', '{"platform":"android","model":"Pixel 8"}', 'RGR-TL002', NOW() - INTERVAL '2 days');

  -- TL005 — Karratha
  INSERT INTO scan_events (asset_id, scan_type, latitude, longitude, accuracy, speed, location_description, device_info, raw_scan_data, created_at)
  VALUES
    (a05, 'qr_scan', -20.7364, 116.8463, 3.5, 0, 'Karratha Depot', '{"platform":"android","model":"Samsung Galaxy XCover 6"}', 'RGR-TL005', NOW() - INTERVAL '6 hours'),
    (a05, 'qr_scan', -20.4100, 118.2400, 8.2, 95, 'Great Northern Hwy — en route Hedland', '{"platform":"android","model":"Samsung Galaxy XCover 6"}', 'RGR-TL005', NOW() - INTERVAL '1 day');

  -- TL008 — Port Hedland
  INSERT INTO scan_events (asset_id, scan_type, latitude, longitude, accuracy, location_description, device_info, raw_scan_data, created_at)
  VALUES
    (a08, 'qr_scan', -20.3106, 118.5753, 4.0, 'Port Hedland Depot', '{"platform":"ios","model":"iPhone 14 Pro"}', 'RGR-TL008', NOW() - INTERVAL '4 hours'),
    (a08, 'qr_scan', -20.3500, 118.6100, 5.5, 'BHP Nelson Point', '{"platform":"ios","model":"iPhone 14 Pro"}', 'RGR-TL008', NOW() - INTERVAL '1 day');

  -- TL011 — Kalgoorlie
  INSERT INTO scan_events (asset_id, scan_type, latitude, longitude, accuracy, location_description, device_info, raw_scan_data, created_at)
  VALUES
    (a11, 'qr_scan', -30.7489, 121.4660, 3.2, 'Kalgoorlie Depot', '{"platform":"android","model":"Samsung Galaxy A54"}', 'RGR-TL011', NOW() - INTERVAL '1 hour');

  -- TL013 — Geraldton
  INSERT INTO scan_events (asset_id, scan_type, latitude, longitude, accuracy, location_description, device_info, raw_scan_data, created_at)
  VALUES
    (a13, 'qr_scan', -28.7745, 114.6150, 4.8, 'Geraldton Depot — cold store', '{"platform":"android","model":"Pixel 7a"}', 'RGR-TL013', NOW() - INTERVAL '10 hours');

  -- DL001 — Perth dolly
  INSERT INTO scan_events (asset_id, scan_type, latitude, longitude, accuracy, location_description, device_info, raw_scan_data, created_at)
  VALUES
    (a21, 'qr_scan', -31.9480, 115.8590, 3.9, 'Perth Depot — dolly bay', '{"platform":"android","model":"Samsung Galaxy A54"}', 'RGR-DL001', NOW() - INTERVAL '3 hours');

  -- DL004 — Karratha dolly
  INSERT INTO scan_events (asset_id, scan_type, latitude, longitude, accuracy, location_description, device_info, raw_scan_data, created_at)
  VALUES
    (a24, 'qr_scan', -20.7380, 116.8480, 5.1, 'Karratha Depot — dolly bay', '{"platform":"android","model":"Samsung Galaxy XCover 6"}', 'RGR-DL004', NOW() - INTERVAL '8 hours');

  -- DL006 — Port Hedland dolly
  INSERT INTO scan_events (asset_id, scan_type, latitude, longitude, accuracy, location_description, device_info, raw_scan_data, created_at)
  VALUES
    (a26, 'qr_scan', -20.3120, 118.5770, 4.3, 'Port Hedland Depot', '{"platform":"ios","model":"iPhone 15"}', 'RGR-DL006', NOW() - INTERVAL '2 hours');

  -- ──────────────────────────────────────────────────────────────────────────
  -- 4. MAINTENANCE RECORDS — a handful across different assets
  -- ──────────────────────────────────────────────────────────────────────────

  -- TL003 — compressor issue (why it's in maintenance)
  INSERT INTO maintenance_records (asset_id, title, description, priority, status, maintenance_type, scheduled_date, due_date, estimated_cost, notes)
  VALUES (a03, 'Reefer compressor replacement', 'Compressor failing intermittently — not holding temperature on long hauls. Replacement unit ordered from Thermo King.', 'high', 'in_progress', 'repair', CURRENT_DATE - 2, CURRENT_DATE + 5, 8500.00, 'Parts ETA 3 days. Unit parked at Perth depot bay 7.');

  -- TL010 — tyre replacement (why it's in maintenance)
  INSERT INTO maintenance_records (asset_id, title, description, priority, status, maintenance_type, scheduled_date, due_date, estimated_cost, notes)
  VALUES (a10, 'Full tyre replacement — rear axle group', 'All 8 rear tyres below minimum tread depth. Bridgestone R249 ordered.', 'high', 'scheduled', 'repair', CURRENT_DATE + 1, CURRENT_DATE + 3, 12000.00, 'Tyres arriving Port Hedland depot tomorrow.');

  -- TL016 — reefer overhaul (why it's in maintenance)
  INSERT INTO maintenance_records (asset_id, title, description, priority, status, maintenance_type, scheduled_date, due_date, estimated_cost, notes)
  VALUES (a16, 'Reefer unit full overhaul', 'Annual reefer service overdue. Needs compressor check, gas recharge, thermostat calibration.', 'medium', 'scheduled', 'service', CURRENT_DATE + 3, CURRENT_DATE + 7, 4200.00, 'Bunbury depot — booked with refrigeration contractor.');

  -- DL003 — turntable bearing (why it's in maintenance)
  INSERT INTO maintenance_records (asset_id, title, description, priority, status, maintenance_type, scheduled_date, due_date, estimated_cost, notes)
  VALUES (a23, 'Turntable bearing replacement', 'Excessive play in turntable. Bearing needs full replacement. Howard Porter parts on order.', 'high', 'in_progress', 'repair', CURRENT_DATE - 3, CURRENT_DATE + 2, 3800.00, 'Perth depot workshop bay 2.');

  -- TL001 — scheduled service (routine)
  INSERT INTO maintenance_records (asset_id, title, description, priority, status, maintenance_type, scheduled_date, due_date, estimated_cost, notes)
  VALUES (a01, 'Annual roadworthy inspection', '12-month inspection due per NHVR requirements. Brake test, suspension check, lighting.', 'medium', 'scheduled', 'inspection', CURRENT_DATE + 14, CURRENT_DATE + 21, 950.00, 'Perth depot — booked with fleet mechanic.');

  -- TL008 — completed maintenance
  INSERT INTO maintenance_records (asset_id, title, description, priority, status, maintenance_type, scheduled_date, started_at, completed_at, estimated_cost, actual_cost, notes)
  VALUES (a08, 'Brake pad replacement — all axles', 'Routine brake pad replacement after 80,000km cycle.', 'medium', 'completed', 'repair', CURRENT_DATE - 14, NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days', 2200.00, 2450.00, 'Completed at Port Hedland. Slightly over budget — rotors also needed skimming.');

  -- TL005 — completed inspection
  INSERT INTO maintenance_records (asset_id, title, description, priority, status, maintenance_type, scheduled_date, started_at, completed_at, estimated_cost, actual_cost, notes)
  VALUES (a05, 'Pre-season heavy haulage inspection', 'Full inspection before wet season Pilbara runs. Chassis, suspension, electrical.', 'low', 'completed', 'inspection', CURRENT_DATE - 21, NOW() - INTERVAL '20 days', NOW() - INTERVAL '19 days', 750.00, 750.00, 'All clear — passed with no defects.');

  RAISE NOTICE 'Seed complete: 30 assets (20 trailers + 10 dollies), scan events, and maintenance records inserted.';

END $$;
