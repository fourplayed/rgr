-- Fix depot locations: Replace seed depots with correct 6 WA depots
-- Perth, Wubin, Newman, Hedland, Karratha, Carnarvon

-- First, clear any asset depot assignments that reference old depots
UPDATE assets SET assigned_depot_id = NULL WHERE assigned_depot_id IS NOT NULL;

-- Delete all existing depots
DELETE FROM depots;

-- Insert the correct 6 depots with accurate coordinates
INSERT INTO depots (name, code, latitude, longitude, is_active) VALUES
    ('Perth', 'PER', -31.9505, 115.8605, TRUE),
    ('Wubin', 'WUB', -30.1167, 116.6333, TRUE),
    ('Newman', 'NEW', -23.3564, 119.7310, TRUE),
    ('Hedland', 'HED', -20.3106, 118.5753, TRUE),
    ('Karratha', 'KAR', -20.7364, 116.8463, TRUE),
    ('Carnarvon', 'CAR', -24.8667, 113.6333, TRUE);
