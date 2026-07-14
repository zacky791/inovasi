const express = require('express');
const cors = require('cors');
const path = require('path');
const reportRoutes = require('./routes/report.routes');
const sensorRoutes = require('./routes/sensor.routes');
const errorHandler = require('./middlewares/error.middleware');
const { ensureUploadDir, UPLOAD_DIR } = require('./utils/file.util');

require('dotenv').config();

ensureUploadDir();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/uploads', express.static(path.resolve(UPLOAD_DIR)));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/reports', reportRoutes);
app.use('/api/sensor', sensorRoutes);

app.use(errorHandler);

module.exports = app;
