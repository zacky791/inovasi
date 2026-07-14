const express = require('express');
const sensorController = require('../controllers/sensor.controller');

const router = express.Router();

router.post('/log', sensorController.createLog);
router.get('/logs/latest', sensorController.getLatestLogs);
router.get('/logs', sensorController.getLogs);
router.get('/devices', sensorController.getDevices);

module.exports = router;
