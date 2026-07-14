USE smart_city;

-- Run once. Ignore "Duplicate column" error if already applied.
ALTER TABLE devices
  ADD COLUMN latitude DECIMAL(10, 8) DEFAULT NULL AFTER location,
  ADD COLUMN longitude DECIMAL(11, 8) DEFAULT NULL AFTER latitude;
