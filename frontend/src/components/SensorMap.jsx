import { GoogleMap, useJsApiLoader, InfoWindowF, MarkerF } from '@react-google-maps/api';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const KL_CENTER = { lat: 3.139003, lng: 101.686855 };
const DEFAULT_ZOOM = 11;
const FOCUS_ZOOM = 10;

const STATUS_PIN_COLORS = {
  SAFE: '#43a047',
  HOLE_DETECTED: '#e53935',
  NO_ECHO: '#f9a825',
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

function formatDistance(distance) {
  if (Number(distance) === -1) return 'No echo';
  return `${Number(distance).toFixed(1)} cm`;
}

function formatTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

function hasCoordinates(sensor) {
  const lat = Number(sensor.latitude);
  const lng = Number(sensor.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng);
}

function getLatestDetection(sensors) {
  if (!sensors.length) return null;

  const holes = sensors.filter((s) => s.status === 'HOLE_DETECTED');
  const pool = holes.length > 0 ? holes : sensors;

  return pool.reduce((latest, sensor) => {
    if (!latest) return sensor;
    return new Date(sensor.created_at) > new Date(latest.created_at) ? sensor : latest;
  }, null);
}

function getMarkerIcon(status) {
  if (!window.google?.maps) return undefined;

  const color = STATUS_PIN_COLORS[status] || STATUS_PIN_COLORS.default;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24">
      <path fill="${color}" stroke="#ffffff" stroke-width="1.2"
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
      <circle fill="#ffffff" cx="12" cy="9" r="2.5"/>
      <circle fill="${color}" cx="12" cy="9" r="1.2"/>
    </svg>
  `;

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg.trim())}`,
    scaledSize: new window.google.maps.Size(44, 44),
    anchor: new window.google.maps.Point(22, 44),
  };
}

function statusClass(status) {
  if (status === 'SAFE') return 'sensor-status-safe';
  if (status === 'HOLE_DETECTED') return 'sensor-status-danger';
  return 'sensor-status-warning';
}

function SensorInfoContent({ sensor }) {
  return (
    <div className="info-window sensor-info-window">
      <p>
        <strong>Device:</strong> {sensor.device_name || sensor.device_id}
      </p>
      <p>
        <strong>Status:</strong>{' '}
        <span className={statusClass(sensor.status)}>{sensor.status}</span>
      </p>
      <p>
        <strong>Distance:</strong> {formatDistance(sensor.distance)}
      </p>
      <p>
        <strong>Buzzer:</strong>{' '}
        {sensor.buzzer_active === 1 || sensor.buzzer_active === true ? 'ON' : 'OFF'}
      </p>
      {sensor.device_location && (
        <p>
          <strong>Location:</strong> {sensor.device_location}
        </p>
      )}
      <p>
        <strong>Last reading:</strong> {formatTime(sensor.created_at)}
      </p>
    </div>
  );
}

export default function SensorMap({ sensors, selectedDeviceId, onSelectDevice }) {
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef(null);
  const centeredRef = useRef(false);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  });

  const mappableSensors = useMemo(
    () => sensors.filter(hasCoordinates),
    [sensors]
  );

  const lastDetection = useMemo(
    () => getLatestDetection(mappableSensors),
    [mappableSensors]
  );

  const initialCenter = useMemo(() => {
    if (!lastDetection) return KL_CENTER;
    return {
      lat: Number(lastDetection.latitude),
      lng: Number(lastDetection.longitude),
    };
  }, [lastDetection]);

  const selectedSensor = useMemo(
    () => mappableSensors.find((sensor) => sensor.device_id === selectedDeviceId) || null,
    [mappableSensors, selectedDeviceId]
  );

  const onLoad = useCallback((map) => {
    mapRef.current = map;
    setMapReady(true);
  }, []);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
    setMapReady(false);
    centeredRef.current = false;
  }, []);

  const focusSensor = useCallback((sensor, zoom = FOCUS_ZOOM) => {
    if (!mapRef.current || !sensor) return;

    mapRef.current.panTo({
      lat: Number(sensor.latitude),
      lng: Number(sensor.longitude),
    });
    mapRef.current.setZoom(zoom);
  }, []);

  const handleMarkerClick = useCallback(
    (sensor) => {
      onSelectDevice?.(sensor.device_id);
      focusSensor(sensor);
    },
    [onSelectDevice, focusSensor]
  );

  const handleMapClick = useCallback(() => {
    onSelectDevice?.(null);
  }, [onSelectDevice]);

  const handleInfoWindowClose = useCallback(() => {
    onSelectDevice?.(null);
  }, [onSelectDevice]);

  useEffect(() => {
    if (!mapReady || !selectedDeviceId) return;

    const sensor = mappableSensors.find((item) => item.device_id === selectedDeviceId);
    if (sensor) {
      focusSensor(sensor);
    }
  }, [selectedDeviceId, mappableSensors, mapReady, focusSensor]);

  // Center on last detection (prefer HOLE_DETECTED, else newest reading)
  useEffect(() => {
    if (!mapReady || !mapRef.current || !lastDetection) return;
    if (centeredRef.current) return;

    focusSensor(lastDetection, FOCUS_ZOOM);
    centeredRef.current = true;
  }, [lastDetection, mapReady, focusSensor]);

  if (loadError) {
    return (
      <div className="map-error map-setup-help">
        <p><strong>Google Maps failed to load.</strong></p>
        <p>Check your VITE_GOOGLE_MAPS_API_KEY in frontend/.env</p>
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

  if (mappableSensors.length === 0) {
    return (
      <div className="map-empty sensor-map-empty">
        <p>No sensor locations yet.</p>
        <p className="text-muted">
          Set <code>DEVICE_LAT</code> and <code>DEVICE_LNG</code> in your ESP32 code, then upload again.
        </p>
      </div>
    );
  }

  return (
    <div className="map-wrapper">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={initialCenter}
        zoom={lastDetection ? FOCUS_ZOOM : DEFAULT_ZOOM}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={handleMapClick}
        options={mapOptions}
      >
        {mappableSensors.map((sensor) => (
          <MarkerF
            key={sensor.device_id}
            position={{
              lat: Number(sensor.latitude),
              lng: Number(sensor.longitude),
            }}
            icon={getMarkerIcon(sensor.status)}
            title={`${sensor.device_id} — ${sensor.status}`}
            clickable
            zIndex={selectedDeviceId === sensor.device_id ? 1000 : 1}
            onClick={(e) => {
              e.domEvent.stopPropagation();
              handleMarkerClick(sensor);
            }}
          />
        ))}

        {selectedSensor && (
          <InfoWindowF
            position={{
              lat: Number(selectedSensor.latitude),
              lng: Number(selectedSensor.longitude),
            }}
            onCloseClick={handleInfoWindowClose}
          >
            <SensorInfoContent sensor={selectedSensor} />
          </InfoWindowF>
        )}
      </GoogleMap>
    </div>
  );
}
