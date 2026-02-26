ALTER TABLE depots ADD COLUMN color VARCHAR(7);

-- Use mobile's colors (the primary user-facing app)
UPDATE depots SET color = '#32CD32' WHERE code = 'PER';  -- Perth - Lime green
UPDATE depots SET color = '#FF8C00' WHERE code = 'WUB';  -- Wubin - Orange
UPDATE depots SET color = '#0066FF' WHERE code = 'NEW';  -- Newman - Blue
UPDATE depots SET color = '#FF1493' WHERE code = 'HED';  -- Hedland - Neon pink
UPDATE depots SET color = '#DFFF00' WHERE code = 'KAR';  -- Karratha - Fluro yellow
UPDATE depots SET color = '#00CED1' WHERE code = 'CAR';  -- Carnarvon - Cyan
