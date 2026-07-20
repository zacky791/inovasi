import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ReportsMap from '../components/ReportsMap';
import SensorMap from '../components/SensorMap';
import {
  getImageUrl,
  getLatestSensorLogs,
  getReports,
  getSensorLogs,
} from '../services/api';
import { getHighlightReportId } from '../services/localReports';
import { getSeverityColor, getStatusLabel } from '../utils/helpers';

const REFRESH_INTERVAL = 5000;
const HISTORY_LIMIT = 30;
const SOURCE_DEVICE = 'device';
const SOURCE_MANUAL = 'manual';

function statusClass(status) {
  if (status === 'SAFE') return 'sensor-status-safe';
  if (status === 'HOLE_DETECTED') return 'sensor-status-danger';
  return 'sensor-status-warning';
}

function formatDistance(distance) {
  if (Number(distance) === -1) return 'No echo';
  return `${Number(distance).toFixed(1)} cm`;
}

function formatCoord(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toFixed(6);
}

function formatClock(value) {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDateHeading(value) {
  if (!value) return 'Unknown date';
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (sameDay(date, today)) return 'Today';
  if (sameDay(date, yesterday)) return 'Yesterday';

  return date.toLocaleDateString([], {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function dateKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'unknown';
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function groupHistoryByDate(rows) {
  const groups = [];
  const indexByKey = new Map();

  rows.forEach((row) => {
    const key = dateKey(row.created_at);
    if (!indexByKey.has(key)) {
      indexByKey.set(key, groups.length);
      groups.push({
        key,
        label: formatDateHeading(row.created_at),
        rows: [],
      });
    }
    groups[indexByKey.get(key)].rows.push(row);
  });

  return groups;
}

function isBuzzerOn(value) {
  return value === true || value === 1 || value === '1';
}

export default function ReportsPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [latestLogs, setLatestLogs] = useState([]);
  const [history, setHistory] = useState([]);
  const [manualReports, setManualReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [highlightReportId, setHighlightReportId] = useState(null);
  const [historySource, setHistorySource] = useState(() =>
    location.state?.historySource === SOURCE_MANUAL ? SOURCE_MANUAL : SOURCE_DEVICE
  );

  const fetchData = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);

      const [latestData, historyData, reportsData] = await Promise.all([
        getLatestSensorLogs(),
        getSensorLogs({ limit: HISTORY_LIMIT }),
        getReports(),
      ]);

      setLatestLogs(latestData);
      setHistory(historyData);
      setManualReports(reportsData.slice(0, HISTORY_LIMIT));
      setLastUpdated(new Date());
      setError(null);
    } catch {
      setError('Failed to load dashboard data. Make sure backend is running on port 3001.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const fromNav = location.state?.historySource === SOURCE_MANUAL;
    const highlightId =
      location.state?.highlightReportId ?? getHighlightReportId();

    if (fromNav || highlightId) {
      setHistorySource(SOURCE_MANUAL);
    }

    if (highlightId) {
      setHighlightReportId(Number(highlightId));
      setSelectedReportId(Number(highlightId));
    }

    if (location.state?.historySource || location.state?.highlightReportId) {
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    fetchData(true);
    const interval = setInterval(() => fetchData(false), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  const hasAlert = latestLogs.some(
    (log) => log.status === 'HOLE_DETECTED' || log.status === 'NO_ECHO'
  );

  const isManual = historySource === SOURCE_MANUAL;
  const historyGroups = useMemo(() => groupHistoryByDate(history), [history]);
  const manualGroups = useMemo(
    () => groupHistoryByDate(manualReports),
    [manualReports]
  );

  const historyCount = isManual ? manualReports.length : history.length;

  return (
    <div className="sensor-page">
      <div className="dashboard-header sensor-dashboard-header">
        <div className="sensor-title-row">
          <h2>Dashboard</h2>
          <p className="page-description sensor-page-description">
            Auto refreshes every 5 seconds.
          </p>
        </div>
        <div className="dashboard-meta">
          {lastUpdated && (
            <span className="text-muted">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => fetchData(true)}
          >
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {hasAlert && !error && !isManual && (
        <div className="sensor-alert-banner">
          Warning: one or more sensors detected a possible hole.
        </div>
      )}

      <div className="legend sensor-map-legend">
        {isManual ? (
          <>
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
          </>
        ) : (
          <>
            <span className="legend-item">
              <span className="legend-dot" style={{ background: '#22c55e' }} />
              SAFE
            </span>
            <span className="legend-item">
              <span className="legend-dot" style={{ background: '#eab308' }} />
              NO_ECHO
            </span>
            <span className="legend-item">
              <span className="legend-dot" style={{ background: '#ef4444' }} />
              HOLE_DETECTED
            </span>
          </>
        )}
      </div>

      <div className="sensor-dashboard-layout">
        <div className="sensor-dashboard-main">
          <div className="map-container sensor-map-container">
            {isManual ? (
              <ReportsMap
                reports={manualReports}
                highlightReportId={highlightReportId}
                onHighlightHandled={() => setHighlightReportId(null)}
                selectedReportId={selectedReportId}
                onSelectReport={setSelectedReportId}
              />
            ) : (
              <SensorMap
                sensors={latestLogs}
                selectedDeviceId={selectedDeviceId}
                onSelectDevice={setSelectedDeviceId}
              />
            )}
          </div>

          {!isManual && (
            <div className="sensor-live-grid">
              <h3>Live devices</h3>
              {loading && latestLogs.length === 0 ? (
                <p className="text-muted">Loading latest readings...</p>
              ) : latestLogs.length === 0 ? (
                <p className="text-muted">
                  No sensor data yet. ESP32 will appear here after first POST.
                </p>
              ) : (
                latestLogs.map((log) => (
                  <button
                    type="button"
                    key={log.device_id}
                    className={`sensor-live-card${selectedDeviceId === log.device_id ? ' sensor-live-card-selected' : ''}`}
                    onClick={() => setSelectedDeviceId(log.device_id)}
                  >
                    <div className="sensor-live-card-header">
                      <strong>{log.device_name || log.device_id}</strong>
                      <span className={statusClass(log.status)}>{log.status}</span>
                    </div>
                    <div className="sensor-live-distance">{formatDistance(log.distance)}</div>
                    <div className="sensor-live-meta">
                      Buzzer: {isBuzzerOn(log.buzzer_active) ? 'ON' : 'OFF'}
                      {' · '}
                      {formatClock(log.created_at)}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <aside className="sensor-dashboard-side">
          <section className="sensor-card sensor-history-panel">
            <div className="sensor-history-panel-header">
              <h3>Recent history</h3>
              <div className="history-source-chips" role="tablist" aria-label="History source">
                <button
                  type="button"
                  role="tab"
                  aria-selected={historySource === SOURCE_DEVICE}
                  className={`history-source-chip${historySource === SOURCE_DEVICE ? ' history-source-chip-active' : ''}`}
                  onClick={() => setHistorySource(SOURCE_DEVICE)}
                >
                  By Device
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={historySource === SOURCE_MANUAL}
                  className={`history-source-chip${historySource === SOURCE_MANUAL ? ' history-source-chip-active' : ''}`}
                  onClick={() => setHistorySource(SOURCE_MANUAL)}
                >
                  By Manual
                </button>
              </div>
            </div>
            <p className="sensor-history-count text-muted">
              {historyCount} {isManual ? 'reports' : 'readings'}
            </p>

            {isManual ? (
              manualReports.length === 0 ? (
                <p className="text-muted">No manual reports yet.</p>
              ) : (
                <div className="sensor-history-table-wrap">
                  <table className="sensor-history-table">
                    <thead>
                      <tr>
                        <th>Photo</th>
                        <th>Time</th>
                        <th>Issue</th>
                        <th>Severity</th>
                        <th>Status</th>
                        <th>Lat</th>
                        <th>Lng</th>
                      </tr>
                    </thead>
                    <tbody>
                      {manualGroups.map((group) => (
                        <Fragment key={group.key}>
                          <tr className="sensor-history-date-row">
                            <td colSpan={7}>{group.label}</td>
                          </tr>
                          {group.rows.map((row) => (
                            <tr
                              key={row.id}
                              className={
                                selectedReportId === row.id
                                  ? 'sensor-history-row-active'
                                  : ''
                              }
                              onClick={() => setSelectedReportId(row.id)}
                            >
                              <td>
                                {row.image_url ? (
                                  <img
                                    src={getImageUrl(row.image_url)}
                                    alt={row.issue_type || 'Report'}
                                    className="history-report-thumb"
                                  />
                                ) : (
                                  '—'
                                )}
                              </td>
                              <td>{formatClock(row.created_at)}</td>
                              <td>{row.issue_type || 'Processing…'}</td>
                              <td>
                                <span
                                  className="severity-badge"
                                  style={{
                                    background: getSeverityColor(row.severity),
                                  }}
                                >
                                  {row.severity || 'N/A'}
                                </span>
                              </td>
                              <td>{getStatusLabel(row.status)}</td>
                              <td>{formatCoord(row.latitude)}</td>
                              <td>{formatCoord(row.longitude)}</td>
                            </tr>
                          ))}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : history.length === 0 ? (
              <p className="text-muted">No history yet.</p>
            ) : (
              <div className="sensor-history-table-wrap">
                <table className="sensor-history-table">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Device</th>
                      <th>Dist</th>
                      <th>Status</th>
                      <th>Buzz</th>
                      <th>Lat</th>
                      <th>Lng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyGroups.map((group) => (
                      <Fragment key={group.key}>
                        <tr className="sensor-history-date-row">
                          <td colSpan={7}>{group.label}</td>
                        </tr>
                        {group.rows.map((row) => (
                          <tr
                            key={row.id}
                            className={
                              selectedDeviceId === row.device_id
                                ? 'sensor-history-row-active'
                                : ''
                            }
                            onClick={() => setSelectedDeviceId(row.device_id)}
                          >
                            <td>{formatClock(row.created_at)}</td>
                            <td>{row.device_id}</td>
                            <td>{formatDistance(row.distance)}</td>
                            <td>
                              <span className={statusClass(row.status)}>{row.status}</span>
                            </td>
                            <td>{isBuzzerOn(row.buzzer_active) ? 'ON' : 'OFF'}</td>
                            <td>{formatCoord(row.latitude)}</td>
                            <td>{formatCoord(row.longitude)}</td>
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
