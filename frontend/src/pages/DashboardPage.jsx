import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getSensorLogs } from '../services/api';

const REFRESH_INTERVAL = 10000;
const HISTORY_LIMIT = 200;
/** Matches ESP32 HOLE_THRESHOLD_CM — distance above this = HOLE_DETECTED */
const HOLE_THRESHOLD_CM = 20;

const STATUS_COLORS = {
  SAFE: '#22c55e',
  HOLE_DETECTED: '#ef4444',
  NO_ECHO: '#eab308',
};

const CHART_COLORS = ['#1565c0', '#22c55e', '#ef4444', '#eab308', '#7c3aed', '#0891b2'];

function formatDistance(distance) {
  const n = Number(distance);
  if (!Number.isFinite(n) || n < 0) return null;
  return Number(n.toFixed(1));
}

function formatTimeLabel(value) {
  if (!value) return '';
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function buildChartData(history) {
  const chronological = [...history].reverse();

  const distanceTrend = chronological
    .map((row) => {
      const distance = formatDistance(row.distance);
      if (distance === null) return null;
      return {
        id: row.id,
        time: formatTimeLabel(row.created_at),
        fullTime: formatDateTime(row.created_at),
        distance,
        holeThreshold: HOLE_THRESHOLD_CM,
        status: row.status,
        device: row.device_id,
      };
    })
    .filter(Boolean);

  const statusCounts = {};
  const byDevice = {};
  const distanceByStatus = {
    SAFE: { total: 0, count: 0 },
    HOLE_DETECTED: { total: 0, count: 0 },
    NO_ECHO: { total: 0, count: 0 },
  };

  const rangeDefs = [
    { name: '0–5', min: 0, max: 5 },
    { name: '5–10', min: 5, max: 10 },
    { name: '10–15', min: 10, max: 15 },
    { name: '15–20', min: 15, max: 20 },
    { name: '20–25', min: 20, max: 25 },
    { name: '25–30', min: 25, max: 30 },
    { name: '30+', min: 30, max: Infinity },
  ];
  const rangeCounts = Object.fromEntries(rangeDefs.map((r) => [r.name, 0]));

  chronological.forEach((row) => {
    const status = row.status || 'UNKNOWN';
    statusCounts[status] = (statusCounts[status] || 0) + 1;

    const deviceId = row.device_id || 'Unknown';
    if (!byDevice[deviceId]) {
      byDevice[deviceId] = { device: deviceId, readings: 0, totalDistance: 0, valid: 0, alerts: 0 };
    }
    byDevice[deviceId].readings += 1;
    if (status === 'HOLE_DETECTED') {
      byDevice[deviceId].alerts += 1;
    }
    const distance = formatDistance(row.distance);
    if (distance !== null) {
      byDevice[deviceId].totalDistance += distance;
      byDevice[deviceId].valid += 1;

      if (distanceByStatus[status]) {
        distanceByStatus[status].total += distance;
        distanceByStatus[status].count += 1;
      }

      const range = rangeDefs.find((r) => distance >= r.min && distance < r.max);
      if (range) rangeCounts[range.name] += 1;
    }
  });

  const statusDistribution = Object.entries(statusCounts).map(([name, value]) => ({
    name,
    value,
    color: STATUS_COLORS[name] || '#78909c',
  }));

  const deviceStats = Object.values(byDevice).map((item) => ({
    device: item.device,
    readings: item.readings,
    alerts: item.alerts,
    avgDistance: item.valid ? Number((item.totalDistance / item.valid).toFixed(1)) : 0,
  }));

  const distanceDistribution = rangeDefs.map((range) => {
    const count = rangeCounts[range.name];
    const isPotholeZone = range.min >= HOLE_THRESHOLD_CM;
    return {
      range: range.name,
      count,
      fill: isPotholeZone ? STATUS_COLORS.HOLE_DETECTED : STATUS_COLORS.SAFE,
      zone: isPotholeZone ? 'Pothole zone' : 'Safe zone',
    };
  });

  const avgByStatus = ['SAFE', 'HOLE_DETECTED', 'NO_ECHO']
    .filter((status) => distanceByStatus[status].count > 0)
    .map((status) => ({
      status,
      avgDistance: Number(
        (distanceByStatus[status].total / distanceByStatus[status].count).toFixed(1)
      ),
      readings: distanceByStatus[status].count,
      fill: STATUS_COLORS[status],
    }));

  const validDistances = distanceTrend.map((d) => d.distance);
  const avgDistance = validDistances.length
    ? Number((validDistances.reduce((a, b) => a + b, 0) / validDistances.length).toFixed(1))
    : 0;
  const minDistance = validDistances.length ? Math.min(...validDistances) : 0;
  const maxDistance = validDistances.length ? Math.max(...validDistances) : 0;
  const potholeDetected = statusCounts.HOLE_DETECTED || 0;
  const holeRate = history.length
    ? Number(((potholeDetected / history.length) * 100).toFixed(1))
    : 0;

  return {
    distanceTrend,
    distanceDistribution,
    avgByStatus,
    statusDistribution,
    deviceStats,
    summary: {
      totalReadings: history.length,
      avgDistance,
      minDistance,
      maxDistance,
      potholeDetected,
      holeRate,
      safeCount: statusCounts.SAFE || 0,
    },
  };
}

export default function DashboardPage() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const historyData = await getSensorLogs({ limit: HISTORY_LIMIT });
      setHistory(historyData);
      setLastUpdated(new Date());
      setError(null);
    } catch {
      setError('Failed to load dashboard data for charts. Make sure backend is running.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(true);
    const interval = setInterval(() => fetchData(false), REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  const charts = useMemo(() => buildChartData(history), [history]);

  return (
    <div className="reports-charts-page">
      <div className="dashboard-header">
        <div>
          <h2>Reports</h2>
          <p className="page-description">
            Charts from live Dashboard sensor data — auto-refreshes every 10 seconds.
          </p>
        </div>
        <div className="dashboard-meta">
          {lastUpdated && (
            <span className="text-muted">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => fetchData(true)}>
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading && history.length === 0 ? (
        <div className="map-loading">Loading chart data...</div>
      ) : history.length === 0 ? (
        <div className="map-empty">
          <p>No sensor data yet.</p>
          <p className="text-muted">Open Dashboard and wait for ESP32 readings, then refresh Reports.</p>
        </div>
      ) : (
        <>
          <div className="chart-summary-grid">
            <div className="chart-stat-card">
              <span className="chart-stat-label">Readings</span>
              <strong className="chart-stat-value">{charts.summary.totalReadings}</strong>
            </div>
            <div className="chart-stat-card">
              <span className="chart-stat-label">Avg distance</span>
              <strong className="chart-stat-value">{charts.summary.avgDistance} cm</strong>
            </div>
            <div className="chart-stat-card">
              <span className="chart-stat-label">Pothole detected</span>
              <strong className="chart-stat-value chart-stat-danger">
                {charts.summary.potholeDetected}
              </strong>
            </div>
            <div className="chart-stat-card">
              <span className="chart-stat-label">Hole rate</span>
              <strong className="chart-stat-value">{charts.summary.holeRate}%</strong>
            </div>
            <div className="chart-stat-card">
              <span className="chart-stat-label">Min / Max</span>
              <strong className="chart-stat-value">
                {charts.summary.minDistance} – {charts.summary.maxDistance} cm
              </strong>
            </div>
            <div className="chart-stat-card">
              <span className="chart-stat-label">SAFE readings</span>
              <strong className="chart-stat-value chart-stat-safe">{charts.summary.safeCount}</strong>
            </div>
          </div>

          <div className="chart-grid">
            <section className="chart-card chart-card-wide">
              <h3>Distance over time</h3>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={charts.distanceTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e6ed" />
                    <XAxis dataKey="time" tick={{ fontSize: 11 }} minTickGap={24} />
                    <YAxis unit=" cm" tick={{ fontSize: 12 }} domain={[0, 'auto']} />
                    <Tooltip
                      formatter={(value) => [`${value} cm`, 'Distance']}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.fullTime || ''}
                    />
                    <Legend
                      payload={[
                        { value: 'Distance', type: 'line', id: 'distance', color: '#1565c0' },
                        {
                          value: `Pothole detected level (${HOLE_THRESHOLD_CM} cm)`,
                          type: 'plainline',
                          id: 'hole-threshold',
                          color: '#ef4444',
                        },
                      ]}
                    />
                    <ReferenceLine
                      y={HOLE_THRESHOLD_CM}
                      stroke="#ef4444"
                      strokeDasharray="6 4"
                      strokeWidth={2}
                      ifOverflow="extendDomain"
                      label={{
                        value: `Pothole detected (≥ ${HOLE_THRESHOLD_CM} cm)`,
                        position: 'insideTopRight',
                        fill: '#ef4444',
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="distance"
                      name="Distance"
                      stroke="#1565c0"
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="chart-card chart-card-wide">
              <h3>Distance distribution</h3>
              <p className="chart-card-hint text-muted">
                How many readings fall in each cm range. Green = below {HOLE_THRESHOLD_CM} cm
                (safe), red = pothole zone (≥ {HOLE_THRESHOLD_CM} cm).
              </p>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={charts.distanceDistribution}
                    margin={{ top: 20, right: 8, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e6ed" vertical={false} />
                    <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value, _name, item) => [
                        `${value} readings`,
                        item?.payload?.zone || 'Count',
                      ]}
                    />
                    <Legend
                      payload={[
                        {
                          value: `Safe zone (< ${HOLE_THRESHOLD_CM} cm)`,
                          type: 'square',
                          id: 'safe',
                          color: STATUS_COLORS.SAFE,
                        },
                        {
                          value: `Pothole zone (≥ ${HOLE_THRESHOLD_CM} cm)`,
                          type: 'square',
                          id: 'hole',
                          color: STATUS_COLORS.HOLE_DETECTED,
                        },
                      ]}
                    />
                    <Bar dataKey="count" name="Readings" radius={[6, 6, 0, 0]} maxBarSize={64}>
                      {charts.distanceDistribution.map((entry) => (
                        <Cell key={entry.range} fill={entry.fill} />
                      ))}
                      <LabelList
                        dataKey="count"
                        position="top"
                        style={{ fontSize: 12, fontWeight: 600 }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="chart-card">
              <h3>Avg distance by status</h3>
              <p className="chart-card-hint text-muted">
                Mean measured distance for each sensor status.
              </p>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={charts.avgByStatus} margin={{ top: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e6ed" vertical={false} />
                    <XAxis dataKey="status" tick={{ fontSize: 11 }} />
                    <YAxis unit=" cm" tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value, _name, item) => [
                        `${value} cm`,
                        `Avg (${item?.payload?.readings || 0} readings)`,
                      ]}
                    />
                    <ReferenceLine
                      y={HOLE_THRESHOLD_CM}
                      stroke="#ef4444"
                      strokeDasharray="6 4"
                      strokeWidth={2}
                      ifOverflow="extendDomain"
                      label={{
                        value: `${HOLE_THRESHOLD_CM} cm`,
                        fill: '#ef4444',
                        fontSize: 11,
                        position: 'insideTopRight',
                      }}
                    />
                    <Bar dataKey="avgDistance" name="Avg distance" radius={[6, 6, 0, 0]} maxBarSize={72}>
                      {charts.avgByStatus.map((entry) => (
                        <Cell key={entry.status} fill={entry.fill} />
                      ))}
                      <LabelList
                        dataKey="avgDistance"
                        position="top"
                        formatter={(v) => `${v}`}
                        style={{ fontSize: 12, fontWeight: 600 }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="chart-card">
              <h3>Status distribution</h3>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={charts.statusDistribution}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {charts.statusDistribution.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="chart-card">
              <h3>Status counts</h3>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={charts.statusDistribution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e6ed" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" name="Count" radius={[6, 6, 0, 0]}>
                      {charts.statusDistribution.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="chart-card">
              <h3>Readings by device</h3>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={charts.deviceStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e6ed" />
                    <XAxis dataKey="device" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="readings" name="Readings" fill={CHART_COLORS[0]} radius={[6, 6, 0, 0]} />
                    <Bar dataKey="alerts" name="Potholes" fill={CHART_COLORS[2]} radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="chart-card chart-card-wide">
              <h3>Average distance by device</h3>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={charts.deviceStats} layout="vertical" margin={{ left: 24 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e6ed" />
                    <XAxis type="number" unit=" cm" tick={{ fontSize: 12 }} />
                    <YAxis type="category" dataKey="device" width={90} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => [`${value} cm`, 'Avg distance']} />
                    <Bar dataKey="avgDistance" name="Avg distance" fill={CHART_COLORS[5]} radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
