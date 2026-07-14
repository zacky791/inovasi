const sensorService = require('../services/sensor.service');
const { ALLOWED_STATUSES } = require('../models/sensor.model');

async function createLog(req, res, next) {
  try {
    const { device_id: deviceId, distance, status, buzzer, latitude, longitude } = req.body;

    if (!deviceId || typeof deviceId !== 'string') {
      return res.status(400).json({ error: 'device_id is required' });
    }

    if (distance === undefined || distance === null || Number.isNaN(Number(distance))) {
      return res.status(400).json({ error: 'distance is required and must be a number' });
    }

    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        error: `status must be one of: ${ALLOWED_STATUSES.join(', ')}`,
      });
    }

    if (
      (latitude !== undefined && Number.isNaN(Number(latitude))) ||
      (longitude !== undefined && Number.isNaN(Number(longitude)))
    ) {
      return res.status(400).json({ error: 'latitude and longitude must be valid numbers' });
    }

    const log = await sensorService.logReading({
      deviceId: deviceId.trim(),
      distance: Number(distance),
      status,
      buzzer: Boolean(buzzer),
      latitude: latitude !== undefined && latitude !== null ? Number(latitude) : undefined,
      longitude: longitude !== undefined && longitude !== null ? Number(longitude) : undefined,
    });

    res.status(201).json(log);
  } catch (error) {
    next(error);
  }
}

async function getLogs(req, res, next) {
  try {
    const logs = await sensorService.getLogs({
      deviceId: req.query.device_id,
      limit: req.query.limit,
    });
    res.json(logs);
  } catch (error) {
    next(error);
  }
}

async function getLatestLogs(_req, res, next) {
  try {
    const logs = await sensorService.getLatestLogs();
    res.json(logs);
  } catch (error) {
    next(error);
  }
}

async function getDevices(_req, res, next) {
  try {
    const devices = await sensorService.getDevices();
    res.json(devices);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createLog,
  getLogs,
  getLatestLogs,
  getDevices,
};
