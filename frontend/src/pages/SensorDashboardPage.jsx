import { useCallback, useEffect, useState } from 'react';
import SensorMap from '../components/SensorMap';
import { getDevices, getLatestSensorLogs, getSensorLogs } from '../services/api';

const REFRESH_INTERVAL = 5000;
const HISTORY_LIMIT = 30;

function statusClass(status) {
  if (status === 'SAFE') return 'sensor-status-safe';
  if (status === 'HOLE_DETECTED') return 'sensor-status-danger';
  return 'sensor-status-warning';
}

function formatDistance(distance) {
  if (Number(distance) === -1) return 'No echo';
  return `${Number(distance).toFixed(1)} cm`;
}

function formatTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function isBuzzerOn(value) {
  return value === true || value === 1 || value === '1';
}

export default function SensorDashboardPage() {
  const [devices, setDevices] = useState([]);
  const [latestLogs, setLatestLogs] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);

  const fetchData = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);

      const [deviceData, latestData, historyData] = await Promise.all([
        getDevices(),
        getLatestSensorLogs(),
        getSensorLogs({ limit: HISTORY_LIMIT }),
      ]);

      setDevices(deviceData);
      setLatestLogs(latestData);
      setHistory(historyData);
      setLastUpdated(new Date());
      setError(null);
    } catch {
      setError('Failed to load sensor data. Make sure backend is running on port 3001.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(true);
    const interval = setInterval(() => fetchData(false), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  const hasAlert = latestLogs.some(
    (log) => log.status === 'HOLE_DETECTED' || log.status === 'NO_ECHO'
  );

  return (
    <div className="sensor-page">
      <div className="dashboard-header">
        <div>
          <h2>IoT Sensor Monitor</h2>
          <p className="page-description">
            Live ESP32 readings from MySQL — auto-refreshes every 5 seconds.
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

      {error && <div className="error-banner">{error}</div>}

      {hasAlert && (
        <div className="sensor-alert-banner">
          Warning: one or more sensors detected a possible hole.
        </div>
      )}

      <div className="legend sensor-map-legend">
        <span className="legend-item">
          <span className="legend-dot" style={{ background: '#43a047' }} />
          Safe
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: '#e53935' }} />
          Hole detected
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: '#f9a825' }} />
          No echo
        </span>
        <span className="legend-item text-muted">Click a pin to view live sensor reading</span>
      </div>

      <div className="map-container sensor-map-container">
        <SensorMap
          sensors={latestLogs}
          selectedDeviceId={selectedDeviceId}
          onSelectDevice={setSelectedDeviceId}
        />
      </div>

      <div className="sensor-live-grid">
        {loading && latestLogs.length === 0 ? (
          <p className="text-muted">Loading live readings...</p>
        ) : latestLogs.length === 0 ? (
          <p className="text-muted">
            No sensor data yet. ESP32 will appear here after first POST.
          </p>
        ) : (
          latestLogs.map((log) => (
            <article
              key={log.device_id}
              className={`sensor-live-card${selectedDeviceId === log.device_id ? ' sensor-live-card-selected' : ''}`}
              onClick={() => setSelectedDeviceId(log.device_id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setSelectedDeviceId(log.device_id);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className="sensor-live-card-header">
                <strong>{log.device_id}</strong>
                <span className={statusClass(log.status)}>{log.status}</span>
              </div>
              <div className="sensor-live-distance">{formatDistance(log.distance)}</div>
              <div className="sensor-live-meta">
                <span>Buzzer: {isBuzzerOn(log.buzzer_active) ? 'ON' : 'OFF'}</span>
                <span className="text-muted">{formatTime(log.created_at)}</span>
              </div>
            </article>
          ))
        )}
      </div>

      <div className="sensor-grid">
        <section className="sensor-card">
          <h3>Registered Devices</h3>
          {loading && devices.length === 0 ? (
            <p className="text-muted">Loading devices...</p>
          ) : devices.length === 0 ? (
            <p className="text-muted">No devices registered yet.</p>
          ) : (
            <ul className="sensor-device-list">
              {devices.map((device) => (
                <li key={device.device_id}>
                  <strong>{device.device_name || device.device_id}</strong>
                  <span className={device.status === 'online' ? 'sensor-online' : 'sensor-offline'}>
                    {device.status}
                  </span>
                  <span className="text-muted">
                    Last seen: {formatTime(device.last_seen)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="sensor-card">
          <h3>Recent History</h3>
          {loading && history.length === 0 ? (
            <p className="text-muted">Loading history...</p>
          ) : history.length === 0 ? (
            <p className="text-muted">No history yet.</p>
          ) : (
            <div className="sensor-history-table-wrap">
              <table className="sensor-history-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Device</th>
                    <th>Distance</th>
                    <th>Status</th>
                    <th>Buzzer</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((log) => (
                    <tr key={log.id}>
                      <td>{formatTime(log.created_at)}</td>
                      <td>{log.device_id}</td>
                      <td>{formatDistance(log.distance)}</td>
                      <td>
                        <span className={statusClass(log.status)}>{log.status}</span>
                      </td>
                      <td>{isBuzzerOn(log.buzzer_active) ? 'ON' : 'OFF'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
