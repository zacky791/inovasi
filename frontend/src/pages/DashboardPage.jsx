import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import ReportsMap from '../components/ReportsMap';
import ReportList from '../components/ReportList';
import { getReports } from '../services/api';
import { getHighlightReportId } from '../services/localReports';

const REFRESH_INTERVAL = 10000;

export default function DashboardPage() {
  const location = useLocation();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [highlightReportId, setHighlightReportId] = useState(null);
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [showSubmittedBanner, setShowSubmittedBanner] = useState(false);
  const [mapResetKey, setMapResetKey] = useState(0);

  const fetchReports = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const data = await getReports();
      setReports(data);
      setLastUpdated(new Date());
      setError(null);
    } catch {
      setError('Failed to load reports. Make sure backend is running on port 3001.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports(true);

    const fromState = location.state?.highlightReportId;
    const fromSession = getHighlightReportId();
    const reportId = fromState || fromSession;

    if (reportId) {
      setHighlightReportId(Number(reportId));
    }

    if (location.state?.justSubmitted) {
      setShowSubmittedBanner(true);
      window.history.replaceState({}, document.title);
    }

    const interval = setInterval(() => fetchReports(false), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchReports, location.state]);

  const handleHighlightHandled = useCallback(() => {
    setHighlightReportId(null);
  }, []);

  const handleSelectReport = useCallback((id) => {
    setSelectedReportId(id);
  }, []);

  const handleRefresh = useCallback(() => {
    fetchReports(true);
    setSelectedReportId(null);
    setMapResetKey((key) => key + 1);
  }, [fetchReports]);

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h2>Admin Dashboard</h2>
          <p className="page-description">
            Real infrastructure reports from the database.
          </p>
        </div>
        <div className="dashboard-meta">
          {lastUpdated && (
            <span className="text-muted">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleRefresh}>
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showSubmittedBanner && (
        <div className="success-banner">
          Report submitted! Your marker is on the map — click it to view the issue details.
          <button
            type="button"
            className="banner-close"
            onClick={() => setShowSubmittedBanner(false)}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      <div className="legend">
        <span className="legend-item">
          <span className="legend-dot" style={{ background: '#e53935' }} />
          High
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: '#f9a825' }} />
          Medium
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: '#43a047' }} />
          Low
        </span>
        <span className="legend-item text-muted">Click pin or list item to view report</span>
      </div>

      <div className="map-container">
        {loading && reports.length === 0 ? (
          <div className="map-loading">Loading reports...</div>
        ) : reports.length === 0 ? (
          <div className="map-empty">
            <p>No reports yet.</p>
            <p className="text-muted">
              Go to <strong>Report Issue</strong>, upload a photo, and click Submit.
            </p>
          </div>
        ) : (
          <ReportsMap
            reports={reports}
            highlightReportId={highlightReportId}
            onHighlightHandled={handleHighlightHandled}
            selectedReportId={selectedReportId}
            onSelectReport={handleSelectReport}
            resetViewKey={mapResetKey}
          />
        )}
      </div>

      {!loading && reports.length > 0 && (
        <ReportList
          reports={reports}
          selectedReportId={selectedReportId}
          onSelectReport={handleSelectReport}
        />
      )}

      <div className="report-count">
        {reports.length} report{reports.length !== 1 ? 's' : ''} total
      </div>
    </div>
  );
}
