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
  d_per UUID;

  -- asset IDs (we'll store them for scan_events + maintenance)
  a01 UUID; a02 UUID; a03 UUID; a04 UUID; a05 UUID;
  a06 UUID; a07 UUID; a08 UUID; a09 UUID; a10 UUID;
  a11 UUID; a12 UUID; a13 UUID; a14 UUID; a15 UUID;
  a16 UUID; a17 UUID; a18 UUID; a19 UUID; a20 UUID;
  a21 UUID; a22 UUID; a23 UUID; a24 UUID; a25 UUID;
  a26 UUID; a27 UUID; a28 UUID; a29 UUID; a30 UUID;

BEGIN
  -- Grab Perth depot UUID (all assets default to Perth)
  SELECT id INTO d_per FROM depots WHERE code = 'PER';

  -- ──────────────────────────────────────────────────────────────────────────
  -- 2. ASSETS — 20 Trailers + 10 Dollies (all at Perth depot)
  -- ──────────────────────────────────────────────────────────────────────────

  -- Trailers with various subtypes
  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('TL001', 'trailer', 'Flattop', 'serviced', 'Vawdrey', 'VB-S3', 2022, '1TQR987', '2026-08-15', d_per, -31.9505, 115.8605, NOW() - INTERVAL '2 hours', 'RGR-TL001', 'Primary Perth metro run')
  RETURNING id INTO a01;

  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('TL002', 'trailer', 'Flattop Tautliner', 'serviced', 'Maxitrans', 'Freighter ST3', 2021, '1TQR654', '2026-11-30', d_per, -31.8868, 115.8613, NOW() - INTERVAL '5 hours', 'RGR-TL002', 'General freight — Welshpool')
  RETURNING id INTO a02;

  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('TL003', 'trailer', 'Mezdeck Tautliner', 'maintenance', 'Lucar', 'RFG-48', 2020, '1TQR321', '2026-03-01', d_per, -31.9523, 115.8613, NOW() - INTERVAL '3 days', 'RGR-TL003', 'Tautliner — frame issue reported')
  RETURNING id INTO a03;

  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('TL004', 'trailer', 'Extendable Flattop', 'serviced', 'Krueger', 'ST-3-OD', 2023, '1TQR111', '2027-02-28', d_per, -31.7920, 115.8881, NOW() - INTERVAL '1 day', 'RGR-TL004', 'Oversize load certified')
  RETURNING id INTO a04;

  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('TL005', 'trailer', 'Dropdeck', 'serviced', 'Vawdrey', 'VB-S3', 2021, '1KAR501', '2026-09-15', d_per, -31.9505, 115.8605, NOW() - INTERVAL '6 hours', 'RGR-TL005', 'Heavy equipment transport')
  RETURNING id INTO a05;

  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('TL006', 'trailer', 'Ramp Trailer', 'serviced', 'Freighter', 'DD-45', 2022, '1KAR502', '2026-12-01', d_per, -31.9505, 115.8605, NOW() - INTERVAL '12 hours', 'RGR-TL006', 'Heavy haulage — machinery')
  RETURNING id INTO a06;

  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('TL007', 'trailer', 'Spreaddeck Ramp Trailer', 'out_of_service', 'Maxitrans', 'Freighter ST3', 2018, '1KAR503', '2025-06-30', d_per, -31.9505, 115.8605, NOW() - INTERVAL '30 days', 'RGR-TL007', 'Decommission pending — frame damage')
  RETURNING id INTO a07;

  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('TL008', 'trailer', '50t Float', 'serviced', 'Azmeb', 'ST-40', 2023, '1PHD801', '2027-01-15', d_per, -31.9505, 115.8605, NOW() - INTERVAL '4 hours', 'RGR-TL008', 'Heavy equipment — mining contract')
  RETURNING id INTO a08;

  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('TL009', 'trailer', '75t Float', 'serviced', 'Azmeb', 'ST-40', 2023, '1PHD802', '2027-01-15', d_per, -31.9505, 115.8605, NOW() - INTERVAL '8 hours', 'RGR-TL009', 'Heavy haulage — excavators')
  RETURNING id INTO a09;

  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('TL010', 'trailer', '100t Float', 'maintenance', 'Krueger', 'ST-3-OD', 2020, '1PHD803', '2026-04-10', d_per, -31.9505, 115.8605, NOW() - INTERVAL '7 days', 'RGR-TL010', 'Tyre replacement scheduled')
  RETURNING id INTO a10;

  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('TL011', 'trailer', 'Flattop', 'serviced', 'Vawdrey', 'VB-S2', 2021, '1KAL111', '2026-10-20', d_per, -31.9505, 115.8605, NOW() - INTERVAL '1 hour', 'RGR-TL011', 'General freight')
  RETURNING id INTO a11;

  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('TL012', 'trailer', 'Tautliner A-Trailer', 'serviced', 'Maxitrans', 'Tautliner', 2022, '1KAL112', '2026-07-15', d_per, -31.9505, 115.8605, NOW() - INTERVAL '3 hours', 'RGR-TL012', 'Retail deliveries')
  RETURNING id INTO a12;

  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('TL013', 'trailer', 'Flattop A-Trailer', 'serviced', 'Lucar', 'RFG-48', 2022, '1GER131', '2026-06-30', d_per, -31.9505, 115.8605, NOW() - INTERVAL '10 hours', 'RGR-TL013', 'A-trailer configuration')
  RETURNING id INTO a13;

  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('TL014', 'trailer', 'Skel Trailer', 'serviced', 'Freighter', 'FB-ST', 2019, '1GER132', '2026-05-01', d_per, -31.9505, 115.8605, NOW() - INTERVAL '2 days', 'RGR-TL014', 'Container transport')
  RETURNING id INTO a14;

  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('TL015', 'trailer', 'Flattop Tautliner', 'serviced', 'Vawdrey', 'VB-CS3', 2023, '1BUN151', '2027-03-15', d_per, -31.9505, 115.8605, NOW() - INTERVAL '5 hours', 'RGR-TL015', 'South-west freight')
  RETURNING id INTO a15;

  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('TL016', 'trailer', 'Dropdeck', 'maintenance', 'Lucar', 'RFG-40', 2019, '1BUN152', '2026-02-28', d_per, -31.9505, 115.8605, NOW() - INTERVAL '14 days', 'RGR-TL016', 'Dropdeck overhaul')
  RETURNING id INTO a16;

  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('TL017', 'trailer', 'Flattop', 'serviced', 'Krueger', 'FB-2A', 2021, '1ALB171', '2026-09-30', d_per, -31.9505, 115.8605, NOW() - INTERVAL '1 day', 'RGR-TL017', 'General freight')
  RETURNING id INTO a17;

  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('TL018', 'trailer', 'Mezdeck Tautliner', 'serviced', 'Maxitrans', 'Tautliner', 2020, '1ALB172', '2026-08-01', d_per, -31.9505, 115.8605, NOW() - INTERVAL '18 hours', 'RGR-TL018', 'Port freight')
  RETURNING id INTO a18;

  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('TL019', 'trailer', 'Ramp Trailer', 'serviced', 'Azmeb', 'ST-35', 2022, '1ESP191', '2026-11-15', d_per, -31.9505, 115.8605, NOW() - INTERVAL '6 hours', 'RGR-TL019', 'Equipment loading')
  RETURNING id INTO a19;

  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('TL020', 'trailer', 'Extendable Flattop', 'out_of_service', 'Vawdrey', 'VB-S2', 2017, '1ESP192', '2025-01-31', d_per, -31.9505, 115.8605, NOW() - INTERVAL '60 days', 'RGR-TL020', 'Retired — structural fatigue')
  RETURNING id INTO a20;

  -- ── DOLLIES (no subtypes) ──

  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('DL001', 'dolly', NULL, 'serviced', 'Howard Porter', 'CD-2A', 2022, '1DPR001', '2026-10-15', d_per, -31.9505, 115.8605, NOW() - INTERVAL '3 hours', 'RGR-DL001', 'B-double converter')
  RETURNING id INTO a21;

  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('DL002', 'dolly', NULL, 'serviced', 'Howard Porter', 'CD-2A', 2021, '1DPR002', '2026-07-20', d_per, -31.9505, 115.8605, NOW() - INTERVAL '1 day', 'RGR-DL002', 'Road-train converter')
  RETURNING id INTO a22;

  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('DL003', 'dolly', NULL, 'maintenance', 'Drake', 'RT-CV', 2019, '1DPR003', '2026-04-01', d_per, -31.9505, 115.8605, NOW() - INTERVAL '5 days', 'RGR-DL003', 'Turntable bearing replacement')
  RETURNING id INTO a23;

  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('DL004', 'dolly', NULL, 'serviced', 'Howard Porter', 'CD-3A', 2023, '1DKR004', '2027-01-30', d_per, -31.9505, 115.8605, NOW() - INTERVAL '8 hours', 'RGR-DL004', 'Triple road-train converter')
  RETURNING id INTO a24;

  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('DL005', 'dolly', NULL, 'serviced', 'Drake', 'RT-CV', 2022, '1DKR005', '2026-08-15', d_per, -31.9505, 115.8605, NOW() - INTERVAL '4 hours', 'RGR-DL005', 'Mine haul converter')
  RETURNING id INTO a25;

  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('DL006', 'dolly', NULL, 'serviced', 'Howard Porter', 'CD-3A', 2023, '1DPH006', '2027-02-28', d_per, -31.9505, 115.8605, NOW() - INTERVAL '2 hours', 'RGR-DL006', 'Quad road-train')
  RETURNING id INTO a26;

  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('DL007', 'dolly', NULL, 'out_of_service', 'Drake', 'RT-CV', 2017, '1DPH007', '2025-03-15', d_per, -31.9505, 115.8605, NOW() - INTERVAL '45 days', 'RGR-DL007', 'Cracked A-frame — written off')
  RETURNING id INTO a27;

  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('DL008', 'dolly', NULL, 'serviced', 'Howard Porter', 'CD-2A', 2022, '1DKL008', '2026-12-01', d_per, -31.9505, 115.8605, NOW() - INTERVAL '6 hours', 'RGR-DL008', 'Road-train converter')
  RETURNING id INTO a28;

  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('DL009', 'dolly', NULL, 'serviced', 'Drake', 'RT-CV', 2021, '1DGR009', '2026-06-15', d_per, -31.9505, 115.8605, NOW() - INTERVAL '12 hours', 'RGR-DL009', 'Mid-west freight')
  RETURNING id INTO a29;

  INSERT INTO assets (asset_number, category, subtype, status, make, model, year_manufactured, registration_number, registration_expiry, assigned_depot_id, last_latitude, last_longitude, last_location_updated_at, qr_code_data, notes)
  VALUES ('DL010', 'dolly', NULL, 'serviced', 'Howard Porter', 'CD-2A', 2020, '1DBN010', '2026-05-30', d_per, -31.9505, 115.8605, NOW() - INTERVAL '2 days', 'RGR-DL010', 'B-double converter')
  RETURNING id INTO a30;

  -- ──────────────────────────────────────────────────────────────────────────
  -- 3. SCAN EVENTS — recent scan history for assets
  -- ──────────────────────────────────────────────────────────────────────────

  -- TL001 — scanned multiple times recently
  INSERT INTO scan_events (asset_id, scan_type, latitude, longitude, accuracy, speed, location_description, device_info, raw_scan_data, created_at)
  VALUES
    (a01, 'qr_scan', -31.9505, 115.8605, 4.2, 0, 'Perth', '{"platform":"android","model":"Samsung Galaxy A54"}', 'RGR-TL001', NOW() - INTERVAL '2 hours'),
    (a01, 'qr_scan', -31.8100, 115.8900, 6.1, 72, 'Great Eastern Hwy — Midland', '{"platform":"android","model":"Samsung Galaxy A54"}', 'RGR-TL001', NOW() - INTERVAL '26 hours'),
    (a01, 'qr_scan', -31.9505, 115.8605, 3.8, 0, 'Perth', '{"platform":"ios","model":"iPhone 15"}', 'RGR-TL001', NOW() - INTERVAL '50 hours');

  -- TL002
  INSERT INTO scan_events (asset_id, scan_type, latitude, longitude, accuracy, location_description, device_info, raw_scan_data, created_at)
  VALUES
    (a02, 'qr_scan', -31.8868, 115.8613, 5.0, 'Perth', '{"platform":"android","model":"Pixel 8"}', 'RGR-TL002', NOW() - INTERVAL '5 hours'),
    (a02, 'qr_scan', -31.9505, 115.8605, 4.5, 'Perth', '{"platform":"android","model":"Pixel 8"}', 'RGR-TL002', NOW() - INTERVAL '2 days');

  -- TL005
  INSERT INTO scan_events (asset_id, scan_type, latitude, longitude, accuracy, speed, location_description, device_info, raw_scan_data, created_at)
  VALUES
    (a05, 'qr_scan', -31.9505, 115.8605, 3.5, 0, 'Perth', '{"platform":"android","model":"Samsung Galaxy XCover 6"}', 'RGR-TL005', NOW() - INTERVAL '6 hours'),
    (a05, 'qr_scan', -31.9505, 115.8605, 8.2, 0, 'Perth', '{"platform":"android","model":"Samsung Galaxy XCover 6"}', 'RGR-TL005', NOW() - INTERVAL '1 day');

  -- TL008
  INSERT INTO scan_events (asset_id, scan_type, latitude, longitude, accuracy, location_description, device_info, raw_scan_data, created_at)
  VALUES
    (a08, 'qr_scan', -31.9505, 115.8605, 4.0, 'Perth', '{"platform":"ios","model":"iPhone 14 Pro"}', 'RGR-TL008', NOW() - INTERVAL '4 hours'),
    (a08, 'qr_scan', -31.9505, 115.8605, 5.5, 'Perth', '{"platform":"ios","model":"iPhone 14 Pro"}', 'RGR-TL008', NOW() - INTERVAL '1 day');

  -- TL011
  INSERT INTO scan_events (asset_id, scan_type, latitude, longitude, accuracy, location_description, device_info, raw_scan_data, created_at)
  VALUES
    (a11, 'qr_scan', -31.9505, 115.8605, 3.2, 'Perth', '{"platform":"android","model":"Samsung Galaxy A54"}', 'RGR-TL011', NOW() - INTERVAL '1 hour');

  -- TL013
  INSERT INTO scan_events (asset_id, scan_type, latitude, longitude, accuracy, location_description, device_info, raw_scan_data, created_at)
  VALUES
    (a13, 'qr_scan', -31.9505, 115.8605, 4.8, 'Perth', '{"platform":"android","model":"Pixel 7a"}', 'RGR-TL013', NOW() - INTERVAL '10 hours');

  -- DL001
  INSERT INTO scan_events (asset_id, scan_type, latitude, longitude, accuracy, location_description, device_info, raw_scan_data, created_at)
  VALUES
    (a21, 'qr_scan', -31.9505, 115.8605, 3.9, 'Perth', '{"platform":"android","model":"Samsung Galaxy A54"}', 'RGR-DL001', NOW() - INTERVAL '3 hours');

  -- DL004
  INSERT INTO scan_events (asset_id, scan_type, latitude, longitude, accuracy, location_description, device_info, raw_scan_data, created_at)
  VALUES
    (a24, 'qr_scan', -31.9505, 115.8605, 5.1, 'Perth', '{"platform":"android","model":"Samsung Galaxy XCover 6"}', 'RGR-DL004', NOW() - INTERVAL '8 hours');

  -- DL006
  INSERT INTO scan_events (asset_id, scan_type, latitude, longitude, accuracy, location_description, device_info, raw_scan_data, created_at)
  VALUES
    (a26, 'qr_scan', -31.9505, 115.8605, 4.3, 'Perth', '{"platform":"ios","model":"iPhone 15"}', 'RGR-DL006', NOW() - INTERVAL '2 hours');

  -- ──────────────────────────────────────────────────────────────────────────
  -- 4. MAINTENANCE RECORDS — a handful across different assets
  -- ──────────────────────────────────────────────────────────────────────────

  -- TL003 — frame issue (why it's in maintenance)
  INSERT INTO maintenance_records (asset_id, title, description, priority, status, maintenance_type, scheduled_date, due_date, estimated_cost, notes)
  VALUES (a03, 'Tautliner frame repair', 'Frame showing signs of stress — needs inspection and potential reinforcement.', 'high', 'in_progress', 'repair', CURRENT_DATE - 2, CURRENT_DATE + 5, 8500.00, 'Perth depot workshop bay 7.');

  -- TL010 — tyre replacement (why it's in maintenance)
  INSERT INTO maintenance_records (asset_id, title, description, priority, status, maintenance_type, scheduled_date, due_date, estimated_cost, notes)
  VALUES (a10, 'Full tyre replacement — rear axle group', 'All 8 rear tyres below minimum tread depth. Bridgestone R249 ordered.', 'high', 'scheduled', 'repair', CURRENT_DATE + 1, CURRENT_DATE + 3, 12000.00, 'Tyres arriving Perth depot tomorrow.');

  -- TL016 — dropdeck overhaul (why it's in maintenance)
  INSERT INTO maintenance_records (asset_id, title, description, priority, status, maintenance_type, scheduled_date, due_date, estimated_cost, notes)
  VALUES (a16, 'Dropdeck hydraulic overhaul', 'Annual hydraulic service overdue. Needs cylinder check, seal replacement.', 'medium', 'scheduled', 'service', CURRENT_DATE + 3, CURRENT_DATE + 7, 4200.00, 'Perth depot — booked with contractor.');

  -- DL003 — turntable bearing (why it's in maintenance)
  INSERT INTO maintenance_records (asset_id, title, description, priority, status, maintenance_type, scheduled_date, due_date, estimated_cost, notes)
  VALUES (a23, 'Turntable bearing replacement', 'Excessive play in turntable. Bearing needs full replacement. Howard Porter parts on order.', 'high', 'in_progress', 'repair', CURRENT_DATE - 3, CURRENT_DATE + 2, 3800.00, 'Perth depot workshop bay 2.');

  -- TL001 — scheduled service (routine)
  INSERT INTO maintenance_records (asset_id, title, description, priority, status, maintenance_type, scheduled_date, due_date, estimated_cost, notes)
  VALUES (a01, 'Annual roadworthy inspection', '12-month inspection due per NHVR requirements. Brake test, suspension check, lighting.', 'medium', 'scheduled', 'inspection', CURRENT_DATE + 14, CURRENT_DATE + 21, 950.00, 'Perth depot — booked with fleet mechanic.');

  -- TL008 — completed maintenance
  INSERT INTO maintenance_records (asset_id, title, description, priority, status, maintenance_type, scheduled_date, started_at, completed_at, estimated_cost, actual_cost, notes)
  VALUES (a08, 'Brake pad replacement — all axles', 'Routine brake pad replacement after 80,000km cycle.', 'medium', 'completed', 'repair', CURRENT_DATE - 14, NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days', 2200.00, 2450.00, 'Completed at Perth depot. Slightly over budget — rotors also needed skimming.');

  -- TL005 — completed inspection
  INSERT INTO maintenance_records (asset_id, title, description, priority, status, maintenance_type, scheduled_date, started_at, completed_at, estimated_cost, actual_cost, notes)
  VALUES (a05, 'Pre-season heavy haulage inspection', 'Full inspection before wet season runs. Chassis, suspension, electrical.', 'low', 'completed', 'inspection', CURRENT_DATE - 21, NOW() - INTERVAL '20 days', NOW() - INTERVAL '19 days', 750.00, 750.00, 'All clear — passed with no defects.');

  -- ──────────────────────────────────────────────────────────────────────────
  -- 6. FIX QR CODE DATA — use rgr://asset/{UUID} format matching parseQRCode()
  -- ──────────────────────────────────────────────────────────────────────────
  UPDATE assets
  SET qr_code_data   = 'rgr://asset/' || id,
      qr_generated_at = NOW()
  WHERE deleted_at IS NULL
    AND qr_code_data LIKE 'RGR-%';

  RAISE NOTICE 'Seed complete: 30 assets (20 trailers + 10 dollies), scan events, maintenance records inserted. All assets at Perth depot with new subtypes. QR codes updated to rgr://asset/{UUID} format.';

END $$;
