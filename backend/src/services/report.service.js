const reportModel = require('../models/report.model');

function formatReport(report) {
  if (!report) return null;

  return {
    id: report.id,
    image_url: report.image_url,
    latitude: parseFloat(report.latitude),
    longitude: parseFloat(report.longitude),
    issue_type: report.issue_type,
    severity: report.severity,
    description: report.description,
    confidence: report.confidence !== null ? parseFloat(report.confidence) : null,
    status: report.status,
    created_at: report.created_at,
    updated_at: report.updated_at,
  };
}

async function createReport({ imageUrl, latitude, longitude, issueType, severity, status, description }) {
  const report = await reportModel.create({
    imageUrl,
    latitude,
    longitude,
    issueType,
    severity,
    status,
    description,
  });
  return formatReport(report);
}

async function getAllReports() {
  const reports = await reportModel.findAll();
  return reports.map(formatReport);
}

async function getReportById(id) {
  const report = await reportModel.findById(id);
  return formatReport(report);
}

module.exports = {
  createReport,
  getAllReports,
  getReportById,
};
