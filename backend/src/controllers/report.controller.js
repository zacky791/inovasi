const reportService = require('../services/report.service');
const { getRelativeImageUrl } = require('../utils/file.util');
const { ALLOWED_SEVERITIES } = require('../models/report.model');

const REPORT_FORM_STATUSES = ['pending', 'in_progress', 'resolved'];

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

    const issueType = (req.body.issue_type || '').trim();
    const severity = req.body.severity;
    const status = req.body.status || 'pending';
    const description = (req.body.description || '').trim();

    if (!issueType || issueType.length > 100) {
      return res.status(400).json({ error: 'Issue type is required (max 100 characters)' });
    }

    if (!ALLOWED_SEVERITIES.includes(severity)) {
      return res.status(400).json({ error: `Severity must be one of: ${ALLOWED_SEVERITIES.join(', ')}` });
    }

    if (!REPORT_FORM_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${REPORT_FORM_STATUSES.join(', ')}` });
    }

    const imageUrl = getRelativeImageUrl(req.file.filename);
    const report = await reportService.createReport({
      imageUrl,
      latitude: lat,
      longitude: lng,
      issueType,
      severity,
      status,
      description: description || null,
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
