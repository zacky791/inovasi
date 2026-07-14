import { GoogleMap, useJsApiLoader, InfoWindowF, MarkerF } from '@react-google-maps/api';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getImageUrl } from '../services/api';
import { formatDate, getSeverityColor, getStatusLabel } from '../utils/helpers';

const KL_CENTER = { lat: 3.139003, lng: 101.686855 };
const DEFAULT_ZOOM = 11;
const MAX_FIT_ZOOM = 14;
const HIGHLIGHT_ZOOM = 16;

const SEVERITY_PIN_COLORS = {
  High: '#e53935',
  Medium: '#f9a825',
  Low: '#43a047',
  default: '#757575',
};

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  streetViewControl: false,
  gestureHandling: 'greedy',
  clickableIcons: false,
};

function getMarkerIcon(severity) {
  if (!window.google?.maps) return undefined;

  const color = SEVERITY_PIN_COLORS[severity] || SEVERITY_PIN_COLORS.default;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24">
      <path fill="${color}" stroke="#ffffff" stroke-width="1.2"
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
      <circle fill="#ffffff" cx="12" cy="9" r="2.8"/>
    </svg>
  `;

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.trim())}`,
    scaledSize: new window.google.maps.Size(40, 40),
    anchor: new window.google.maps.Point(20, 40),
  };
}

function fitBoundsZoomedOut(map, bounds, maxZoom = MAX_FIT_ZOOM) {
  map.fitBounds(bounds, { top: 120, right: 120, bottom: 120, left: 120 });

  window.google.maps.event.addListenerOnce(map, 'bounds_changed', () => {
    if (map.getZoom() > maxZoom) {
      map.setZoom(maxZoom);
    }
  });
}

function ReportInfoContent({ report }) {
  return (
    <div className="info-window">
      {report.image_url && (
        <img
          src={getImageUrl(report.image_url)}
          alt={report.issue_type || 'Report'}
          className="info-window-image"
        />
      )}
      <p>
        <strong>Issue:</strong> {report.issue_type || 'Unknown'}
      </p>
      <p>
        <strong>Severity:</strong>{' '}
        <span style={{ color: getSeverityColor(report.severity) }}>
          {report.severity || 'N/A'}
        </span>
      </p>
      <p>
        <strong>Status:</strong> {getStatusLabel(report.status)}
      </p>
      <p>
        <strong>Description:</strong> {report.description || 'No description.'}
      </p>
      {report.confidence !== null && (
        <p>
          <strong>Confidence:</strong> {report.confidence}%
        </p>
      )}
      <p>
        <strong>Created:</strong> {formatDate(report.created_at)}
      </p>
    </div>
  );
}

export default function ReportsMap({
  reports,
  highlightReportId,
  onHighlightHandled,
  selectedReportId,
  onSelectReport,
  resetViewKey,
}) {
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef(null);
  const fittedCountRef = useRef(0);
  const highlightHandledRef = useRef(false);

  useEffect(() => {
    highlightHandledRef.current = false;
  }, [highlightReportId]);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  });

  const selectedReport = useMemo(
    () => reports.find((r) => r.id === selectedReportId) || null,
    [reports, selectedReportId]
  );

  const onLoad = useCallback((map) => {
    mapRef.current = map;
    setMapReady(true);
  }, []);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
    setMapReady(false);
  }, []);

  const handleMarkerClick = useCallback(
    (report) => {
      onSelectReport?.(report.id);
    },
    [onSelectReport]
  );

  const handleMapClick = useCallback(() => {
    onSelectReport?.(null);
  }, [onSelectReport]);

  const handleInfoWindowClose = useCallback(() => {
    onSelectReport?.(null);
  }, [onSelectReport]);

  const focusReport = useCallback((report, zoom = HIGHLIGHT_ZOOM) => {
    if (!mapRef.current || !report) return;

    mapRef.current.panTo({
      lat: Number(report.latitude),
      lng: Number(report.longitude),
    });
    mapRef.current.setZoom(zoom);
  }, []);

  const resetToInitialView = useCallback(() => {
    if (!mapRef.current) return;

    mapRef.current.setCenter(KL_CENTER);
    mapRef.current.setZoom(DEFAULT_ZOOM);
  }, []);

  // Reset map to initial Malaysia view when refresh is clicked
  useEffect(() => {
    if (!mapReady || resetViewKey === 0) return;
    resetToInitialView();
    onSelectReport?.(null);
  }, [resetViewKey, mapReady, resetToInitialView, onSelectReport]);

  // Pan map when a report is selected from the list
  useEffect(() => {
    if (!mapReady || !selectedReportId) return;

    const report = reports.find((r) => r.id === selectedReportId);
    if (report) {
      focusReport(report);
    }
  }, [selectedReportId, reports, mapReady, focusReport]);

  // Fit map to markers once when reports are loaded
  useEffect(() => {
    if (!mapReady || !mapRef.current || reports.length === 0) return;
    if (highlightReportId && !highlightHandledRef.current) return;

    if (fittedCountRef.current === reports.length) return;

    const bounds = new window.google.maps.LatLngBounds();
    reports.forEach((report) => {
      bounds.extend({
        lat: Number(report.latitude),
        lng: Number(report.longitude),
      });
    });

    fitBoundsZoomedOut(mapRef.current, bounds);
    fittedCountRef.current = reports.length;
  }, [reports, mapReady, highlightReportId]);

  // Open popup for newly submitted report
  useEffect(() => {
    if (!mapReady || !mapRef.current || !highlightReportId || highlightHandledRef.current) {
      return;
    }

    const report = reports.find((r) => r.id === highlightReportId);
    if (!report) return;

    focusReport(report);
    onSelectReport?.(report.id);

    highlightHandledRef.current = true;
    fittedCountRef.current = reports.length;
    onHighlightHandled?.();
  }, [highlightReportId, reports, mapReady, onHighlightHandled, onSelectReport, focusReport]);

  if (loadError) {
    return (
      <div className="map-error map-setup-help">
        <p><strong>Google Maps failed to load.</strong></p>
        <p>Fix this in Google Cloud Console:</p>
        <ol>
          <li>Enable <strong>Maps JavaScript API</strong></li>
          <li>Link a <strong>billing account</strong> (required even for free tier)</li>
          <li>Under API key → Application restrictions → HTTP referrers, add:
            <code>http://localhost:5173/*</code> and <code>http://127.0.0.1:5173/*</code>
          </li>
          <li>Restart frontend: <code>npm start</code></li>
        </ol>
        <p className="text-muted">
          Console: console.cloud.google.com → APIs &amp; Services → Credentials
        </p>
      </div>
    );
  }

  if (!isLoaded) {
    return <div className="map-loading">Loading map...</div>;
  }

  if (!import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
    return (
      <div className="map-error">
        Google Maps API key is missing. Set VITE_GOOGLE_MAPS_API_KEY in frontend/.env
      </div>
    );
  }

  return (
    <div className="map-wrapper">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={KL_CENTER}
        zoom={DEFAULT_ZOOM}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={handleMapClick}
        options={mapOptions}
      >
        {reports.map((report) => (
          <MarkerF
            key={report.id}
            position={{
              lat: Number(report.latitude),
              lng: Number(report.longitude),
            }}
            icon={getMarkerIcon(report.severity)}
            title={report.issue_type || 'Infrastructure report'}
            clickable
            zIndex={selectedReportId === report.id ? 1000 : 1}
            onClick={(e) => {
              e.domEvent.stopPropagation();
              handleMarkerClick(report);
            }}
          />
        ))}

        {selectedReport && (
          <InfoWindowF
            position={{
              lat: Number(selectedReport.latitude),
              lng: Number(selectedReport.longitude),
            }}
            onCloseClick={handleInfoWindowClose}
          >
            <ReportInfoContent report={selectedReport} />
          </InfoWindowF>
        )}
      </GoogleMap>
    </div>
  );
}
