import { Outlet, Link, useLocation } from 'react-router-dom';

export default function Layout() {
  const location = useLocation();

  return (
    <div className="app">
      <header className="header">
        <Link to="/dashboard" className="logo">
          Smart City
        </Link>
        <nav className="nav" aria-label="Main">
          <div className="nav-links">
            <Link
              to="/dashboard"
              className={location.pathname === '/dashboard' ? 'active' : ''}
            >
              Dashboard
            </Link>
            <Link
              to="/reports"
              className={location.pathname === '/reports' ? 'active' : ''}
            >
              Reports
            </Link>
          </div>
          <Link
            to="/report"
            className={`nav-report-btn${location.pathname === '/report' ? ' active' : ''}`}
          >
            <span className="nav-report-full">Report Issue</span>
            <span className="nav-report-short">Report</span>
          </Link>
        </nav>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
