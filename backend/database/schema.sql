-- PostgreSQL schema for Smart City
-- Run in DBeaver or: psql -U postgres -d smart_city -f schema.sql

CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  image_url VARCHAR(500) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  issue_type VARCHAR(100) DEFAULT NULL,
  severity VARCHAR(20) DEFAULT NULL CHECK (severity IS NULL OR severity IN ('Low', 'Medium', 'High')),
  description TEXT DEFAULT NULL,
  confidence DECIMAL(5, 2) DEFAULT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'pending', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS devices (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(50) UNIQUE NOT NULL,
  device_name VARCHAR(100) DEFAULT NULL,
  location VARCHAR(255) DEFAULT NULL,
  latitude DECIMAL(10, 8) DEFAULT NULL,
  longitude DECIMAL(11, 8) DEFAULT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline')),
  last_seen TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sensor_logs (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(50) NOT NULL REFERENCES devices(device_id),
  distance DECIMAL(6, 2) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('SAFE', 'HOLE_DETECTED', 'NO_ECHO')),
  buzzer_active BOOLEAN NOT NULL DEFAULT FALSE,
  latitude DECIMAL(10, 8) DEFAULT NULL,
  longitude DECIMAL(11, 8) DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_device_created ON sensor_logs (device_id, created_at DESC);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reports_set_updated_at ON reports;
CREATE TRIGGER reports_set_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE PROCEDURE set_updated_at();
