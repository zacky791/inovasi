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

      navigate('/dashboard', { state: { highlightReportId: report.id, justSubmitted: true } });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="report-page">
      <h2>Report Infrastructure Issue</h2>
      <p className="page-description">
        Take a photo or upload an image of the damaged infrastructure. Your location will
        be captured automatically.
      </p>

      <form onSubmit={handleSubmit} className="report-form">
        <div className="photo-section">
          <div className="photo-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => cameraInputRef.current?.click()}
            >
              Take Photo
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => fileInputRef.current?.click()}
            >
              Upload Image
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

          {preview && (
            <div className="preview-container">
              <img src={preview} alt="Preview" className="preview-image" />
            </div>
          )}
        </div>

        <div className="location-section">
          <h3>Location</h3>
          {geoLoading && <p className="text-muted">Detecting GPS location...</p>}
          {geoError && (
            <p className="text-muted">
              GPS unavailable — demo location (Kuala Lumpur) will be used.
            </p>
          )}
          {!geoLoading && (
            <div className="location-info">
              <p>
                <strong>Latitude:</strong>{' '}
                {(latitude ?? DEMO_LOCATION.latitude).toFixed(6)}
              </p>
              <p>
                <strong>Longitude:</strong>{' '}
                {(longitude ?? DEMO_LOCATION.longitude).toFixed(6)}
              </p>
              {geoError && (
                <p className="text-muted">Enable location in your browser for accurate GPS.</p>
              )}
            </div>
          )}
        </div>

        {error && <p className="error-text">{error}</p>}

        <button
          type="submit"
          className="btn btn-primary btn-full"
          disabled={submitting}
        >
          {submitting ? 'Submitting...' : 'Submit Report'}
        </button>
      </form>

      {submitting && (
        <div className="overlay">
          <div className="spinner" />
          <p>Submitting report...</p>
        </div>
      )}
    </div>
  );
}
