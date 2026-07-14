import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="landing">
      <div className="landing-content">
        <h1>Smart City Infrastructure Reporting System</h1>
        <p className="landing-subtitle">
          Report damaged public infrastructure with a photo. AI analyzes the issue and
          displays it on the admin dashboard.
        </p>
        <div className="landing-actions">
          <Link to="/report" className="btn btn-primary">
            Report Issue
          </Link>
          <Link to="/sensors" className="btn btn-primary">
            IoT Sensors
          </Link>
          <Link to="/dashboard" className="btn btn-secondary">
            View Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
