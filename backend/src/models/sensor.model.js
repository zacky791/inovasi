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

  const existing = await pool.query('SELECT device_id FROM devices WHERE device_id = $1', [
    deviceId,
  ]);

  if (existing.rows.length === 0) {
    await pool.query(
      `INSERT INTO devices (device_id, device_name, latitude, longitude, status, last_seen)
       VALUES ($1, $2, $3, $4, 'online', NOW())`,
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
    await pool.query(
      `UPDATE devices
       SET status = 'online', last_seen = NOW(), latitude = $1, longitude = $2
       WHERE device_id = $3`,
      [Number(latitude), Number(longitude), deviceId]
    );
    return;
  }

  await pool.query(
    `UPDATE devices SET status = 'online', last_seen = NOW() WHERE device_id = $1`,
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

  const result = await pool.query(
    `INSERT INTO sensor_logs (device_id, distance, status, buzzer_active, latitude, longitude)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      deviceId,
      distance,
      status,
      Boolean(buzzerActive),
      hasCoords ? Number(latitude) : null,
      hasCoords ? Number(longitude) : null,
    ]
  );

  return findLogById(result.rows[0].id);
}

async function findLogById(id) {
  const result = await pool.query('SELECT * FROM sensor_logs WHERE id = $1', [id]);
  return result.rows[0] || null;
}

async function findLogs({ deviceId, limit = 50 }) {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);

  if (deviceId) {
    const result = await pool.query(
      `SELECT * FROM sensor_logs
       WHERE device_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [deviceId, safeLimit]
    );
    return result.rows;
  }

  const result = await pool.query(
    `SELECT * FROM sensor_logs
     ORDER BY created_at DESC
     LIMIT $1`,
    [safeLimit]
  );
  return result.rows;
}

async function findLatestByDevice() {
  const result = await pool.query(
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
  return result.rows;
}

async function findAllDevices() {
  const result = await pool.query(
    'SELECT * FROM devices ORDER BY last_seen DESC NULLS LAST, device_id ASC'
  );
  return result.rows;
}

module.exports = {
  createLog,
  findLogById,
  findLogs,
  findLatestByDevice,
  findAllDevices,
  ALLOWED_STATUSES,
};
