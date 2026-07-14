import { getImageUrl } from '../services/api';
import { formatDate, getSeverityColor, getStatusLabel } from '../utils/helpers';

export default function ReportList({ reports, selectedReportId, onSelectReport }) {
  if (reports.length === 0) {
    return (
      <div className="report-list-empty">
        <p>No reports found.</p>
      </div>
    );
  }

  return (
    <div className="report-list-section">
      <h3>All Findings ({reports.length})</h3>
      <div className="report-list">
        {reports.map((report) => {
          const isSelected = selectedReportId === report.id;

          return (
            <button
              key={report.id}
              type="button"
              className={`report-list-item ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectReport(report.id)}
            >
              <img
                src={getImageUrl(report.image_url)}
                alt={report.issue_type || 'Report'}
                className="report-list-thumb"
              />
              <div className="report-list-content">
                <div className="report-list-header">
                  <strong>{report.issue_type || 'Unknown'}</strong>
                  <span
                    className="severity-badge"
                    style={{ background: getSeverityColor(report.severity) }}
                  >
                    {report.severity || 'N/A'}
                  </span>
                </div>
                <p className="report-list-desc">{report.description}</p>
                <div className="report-list-meta">
                  <span>{getStatusLabel(report.status)}</span>
                  {report.confidence !== null && <span>{report.confidence}% confidence</span>}
                  <span>{formatDate(report.created_at)}</span>
                </div>
                <div className="report-list-location text-muted">
                  {Number(report.latitude).toFixed(4)}, {Number(report.longitude).toFixed(4)}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
