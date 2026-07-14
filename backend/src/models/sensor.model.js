const pool = require('../config/db');

const ALLOWED_STATUSES = ['SAFE', 'HOLE_DETECTED', 'NO_ECHO'];

async function ensureDevice(deviceId, { latitude, longitude } = {}) {
  const hasCoords =
    latitude !== undefined &&
    latitude !== null &&
    longitude !== undefined &&
    longitude !== null &&
    !Number.isNaN(Number(latitude)) &&
    !Number.isNaN(Number(longitude));

  const [existing] = await pool.execute(
    'SELECT device_id FROM devices WHERE device_id = ?',
    [deviceId]
  );

  if (existing.length === 0) {
    await pool.execute(
      `INSERT INTO devices (device_id, device_name, latitude, longitude, status, last_seen)
       VALUES (?, ?, ?, ?, 'online', NOW())`,
      [
        deviceId,
        deviceId,
        hasCoords ? Number(latitude) : null,
        hasCoords ? Number(longitude) : null,
      ]
    );
    return;
  }

  if (hasCoords) {
    await pool.execute(
      `UPDATE devices
       SET status = 'online', last_seen = NOW(), latitude = ?, longitude = ?
       WHERE device_id = ?`,
      [Number(latitude), Number(longitude), deviceId]
    );
    return;
  }

  await pool.execute(
    `UPDATE devices SET status = 'online', last_seen = NOW() WHERE device_id = ?`,
    [deviceId]
  );
}

async function createLog({ deviceId, distance, status, buzzerActive, latitude, longitude }) {
  await ensureDevice(deviceId, { latitude, longitude });

  const hasCoords =
    latitude !== undefined &&
    latitude !== null &&
    longitude !== undefined &&
    longitude !== null &&
    !Number.isNaN(Number(latitude)) &&
    !Number.isNaN(Number(longitude));

  const [result] = await pool.execute(
    `INSERT INTO sensor_logs (device_id, distance, status, buzzer_active, latitude, longitude)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      deviceId,
      distance,
      status,
      buzzerActive ? 1 : 0,
      hasCoords ? Number(latitude) : null,
      hasCoords ? Number(longitude) : null,
    ]
  );

  return findLogById(result.insertId);
}

async function findLogById(id) {
  const [rows] = await pool.execute('SELECT * FROM sensor_logs WHERE id = ?', [id]);
  return rows[0] || null;
}

async function findLogs({ deviceId, limit = 50 }) {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);

  if (deviceId) {
    const [rows] = await pool.execute(
      `SELECT * FROM sensor_logs
       WHERE device_id = ?
       ORDER BY created_at DESC
       LIMIT ${safeLimit}`,
      [deviceId]
    );
    return rows;
  }

  const [rows] = await pool.execute(
    `SELECT * FROM sensor_logs
     ORDER BY created_at DESC
     LIMIT ${safeLimit}`
  );
  return rows;
}

async function findLatestByDevice() {
  const [rows] = await pool.execute(
    `SELECT
       sl.id,
       sl.device_id,
       sl.distance,
       sl.status,
       sl.buzzer_active,
       sl.created_at,
       COALESCE(sl.latitude, d.latitude) AS latitude,
       COALESCE(sl.longitude, d.longitude) AS longitude,
       d.device_name,
       d.location AS device_location
     FROM sensor_logs sl
     INNER JOIN (
       SELECT device_id, MAX(id) AS max_id
       FROM sensor_logs
       GROUP BY device_id
     ) latest ON sl.id = latest.max_id
     LEFT JOIN devices d ON d.device_id = sl.device_id
     ORDER BY sl.created_at DESC`
  );
  return rows;
}

async function findAllDevices() {
  const [rows] = await pool.execute(
    'SELECT * FROM devices ORDER BY last_seen DESC, device_id ASC'
  );
  return rows;
}

module.exports = {
  createLog,
  findLogById,
  findLogs,
  findLatestByDevice,
  findAllDevices,
  ALLOWED_STATUSES,
};
