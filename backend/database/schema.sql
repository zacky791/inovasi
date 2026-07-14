CREATE DATABASE IF NOT EXISTS smart_city;
USE smart_city;

CREATE TABLE IF NOT EXISTS reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  image_url VARCHAR(500) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  issue_type VARCHAR(100) DEFAULT NULL,
  severity ENUM('Low', 'Medium', 'High') DEFAULT NULL,
  description TEXT DEFAULT NULL,
  confidence DECIMAL(5, 2) DEFAULT NULL,
  status ENUM('processing', 'pending', 'failed') NOT NULL DEFAULT 'processing',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS devices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  device_id VARCHAR(50) UNIQUE NOT NULL,
  device_name VARCHAR(100) DEFAULT NULL,
  location VARCHAR(255) DEFAULT NULL,
  latitude DECIMAL(10, 8) DEFAULT NULL,
  longitude DECIMAL(11, 8) DEFAULT NULL,
  status ENUM('online', 'offline') NOT NULL DEFAULT 'offline',
  last_seen TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sensor_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  device_id VARCHAR(50) NOT NULL,
  distance DECIMAL(6, 2) NOT NULL,
  status ENUM('SAFE', 'HOLE_DETECTED', 'NO_ECHO') NOT NULL,
  buzzer_active TINYINT(1) NOT NULL DEFAULT 0,
  latitude DECIMAL(10, 8) DEFAULT NULL,
  longitude DECIMAL(11, 8) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_device_created (device_id, created_at),
  CONSTRAINT fk_sensor_logs_device
    FOREIGN KEY (device_id) REFERENCES devices(device_id)
);
