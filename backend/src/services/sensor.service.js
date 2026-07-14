const sensorModel = require('../models/sensor.model');

async function logReading({ deviceId, distance, status, buzzer, latitude, longitude }) {
  return sensorModel.createLog({
    deviceId,
    distance,
    status,
    buzzerActive: Boolean(buzzer),
    latitude,
    longitude,
  });
}

async function getLogs({ deviceId, limit }) {
  return sensorModel.findLogs({ deviceId, limit });
}

async function getLatestLogs() {
  return sensorModel.findLatestByDevice();
}

async function getDevices() {
  return sensorModel.findAllDevices();
}

module.exports = {
  logReading,
  getLogs,
  getLatestLogs,
  getDevices,
};
