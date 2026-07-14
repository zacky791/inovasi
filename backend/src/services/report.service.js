const reportModel = require('../models/report.model');
const aiService = require('./ai.service');

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

async function createReport({ imageUrl, latitude, longitude }) {
  const report = await reportModel.create({ imageUrl, latitude, longitude });
  processReportWithAi(report.id);
  return formatReport(report);
}

async function processReportWithAi(reportId) {
  try {
    const report = await reportModel.findById(reportId);
    if (!report) return;

    const aiResult = await aiService.analyzeImage(report.image_url);

    await reportModel.updateAiResult(reportId, {
      issueType: aiResult.issueType,
      severity: aiResult.severity,
      description: aiResult.description,
      confidence: aiResult.confidence,
      status: 'pending',
    });
  } catch (error) {
    console.error(`AI processing failed for report ${reportId}:`, error.message);
    await reportModel.markFailed(reportId);
  }
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
