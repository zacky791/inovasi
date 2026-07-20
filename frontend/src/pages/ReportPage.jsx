import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGeolocation } from '../hooks/useGeolocation';
import { createReport } from '../services/api';
import { DEMO_LOCATION, setHighlightReportId } from '../services/localReports';

export default function ReportPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const { latitude, longitude, error: geoError, loading: geoLoading } = useGeolocation();

  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function handleFileSelect(selectedFile) {
    if (!selectedFile) return;

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
    setError(null);
  }

  function handleFileChange(e) {
    handleFileSelect(e.target.files[0]);
  }

  function clearPhoto() {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError('Please take or upload a photo');
      return;
    }

    const usingDemoLocation = latitude === null || longitude === null;
    const lat = usingDemoLocation ? DEMO_LOCATION.latitude : latitude;
    const lng = usingDemoLocation ? DEMO_LOCATION.longitude : longitude;

    const formData = new FormData();
    formData.append('image', file);
    formData.append('latitude', lat);
    formData.append('longitude', lng);

    try {
      setSubmitting(true);

      const report = await createReport(formData);
      setHighlightReportId(report.id);

      navigate('/dashboard', {
        state: {
          historySource: 'manual',
          highlightReportId: report.id,
        },
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const resolvedLat = latitude ?? DEMO_LOCATION.latitude;
  const resolvedLng = longitude ?? DEMO_LOCATION.longitude;
  const locationReady = !geoLoading;
  const usingLiveGps = locationReady && !geoError && latitude !== null;

  return (
    <div className="report-page">
      <header className="report-hero">
        <p className="report-eyebrow">Citizen report</p>
        <h2>Report Infrastructure Issue</h2>
      </header>

      <form onSubmit={handleSubmit} className="report-form">
        <section className="report-panel">
          <div className="report-panel-header">
            <h3>Photo</h3>
            <span className="report-step">Step 1</span>
          </div>

          <div className={`report-dropzone${preview ? ' report-dropzone-filled' : ''}`}>
            {preview ? (
              <div className="preview-container">
                <img src={preview} alt="Preview" className="preview-image" />
                <button type="button" className="report-clear-photo" onClick={clearPhoto}>
                  Remove
                </button>
              </div>
            ) : (
              <div className="report-dropzone-empty">
                <div className="report-dropzone-icon" aria-hidden="true">
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                    <rect
                      x="3"
                      y="5"
                      width="18"
                      height="14"
                      rx="2.5"
                      stroke="currentColor"
                      strokeWidth="1.6"
                    />
                    <circle cx="8.5" cy="10" r="1.5" fill="currentColor" />
                    <path
                      d="M3.5 16.5l4.2-4.2a1.5 1.5 0 012.1 0L14 16.5l2.2-2.2a1.5 1.5 0 012.1 0l2.2 2.2"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <p className="report-dropzone-title">Add a clear photo of the issue</p>
                <p className="text-muted">Camera or gallery — JPG, PNG</p>
              </div>
            )}
          </div>

          <div className="photo-actions">
            <button
              type="button"
              className="report-action-btn"
              onClick={() => cameraInputRef.current?.click()}
            >
              <span className="report-action-label">Take Photo</span>
              <span className="report-action-hint">Use camera</span>
            </button>
            <button
              type="button"
              className="report-action-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="report-action-label">Upload Image</span>
              <span className="report-action-hint">From device</span>
            </button>
          </div>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            hidden
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            hidden
          />
        </section>

        <section className="report-panel">
          <div className="report-panel-header">
            <h3>Location</h3>
            <span className="report-step">Step 2</span>
          </div>

          <div
            className={`location-status${
              usingLiveGps
                ? ' location-status-live'
                : geoLoading
                  ? ' location-status-loading'
                  : ' location-status-demo'
            }`}
          >
            <span className="location-status-dot" />
            {geoLoading && <span>Detecting GPS…</span>}
            {usingLiveGps && <span>Live GPS locked</span>}
            {!geoLoading && geoError && <span>Using demo location (KL)</span>}
          </div>

          {locationReady && (
            <div className="location-info">
              <div className="location-chip">
                <span className="location-chip-label">Latitude</span>
                <strong>{Number(resolvedLat).toFixed(6)}</strong>
              </div>
              <div className="location-chip">
                <span className="location-chip-label">Longitude</span>
                <strong>{Number(resolvedLng).toFixed(6)}</strong>
              </div>
            </div>
          )}

          {geoError && !geoLoading && (
            <p className="text-muted location-help">
              Enable location in your browser for an accurate pin on the map.
            </p>
          )}
        </section>

        {error && <p className="error-text">{error}</p>}

        <button
          type="submit"
          className="btn btn-primary btn-full report-submit"
          disabled={submitting}
        >
          {submitting ? 'Submitting…' : 'Submit Report'}
        </button>
      </form>

      {submitting && (
        <div className="overlay">
          <div className="spinner" />
          <p>Submitting report…</p>
        </div>
      )}
    </div>
  );
}
