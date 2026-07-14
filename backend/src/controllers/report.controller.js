const reportService = require('../services/report.service');
const { getRelativeImageUrl } = require('../utils/file.util');

async function createReport(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Image is required' });
    }

    const { latitude, longitude } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return res.status(400).json({ error: 'Invalid latitude or longitude' });
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ error: 'Latitude or longitude out of range' });
    }

    const imageUrl = getRelativeImageUrl(req.file.filename);
    const report = await reportService.createReport({
      imageUrl,
      latitude: lat,
      longitude: lng,
    });

    res.status(201).json(report);
  } catch (error) {
    next(error);
  }
}

async function getAllReports(_req, res, next) {
  try {
    const reports = await reportService.getAllReports();
    res.json(reports);
  } catch (error) {
    next(error);
  }
}

async function getReportById(req, res, next) {
  try {
    const report = await reportService.getReportById(req.params.id);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json(report);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createReport,
  getAllReports,
  getReportById,
};
