import { Outlet, Link, useLocation } from 'react-router-dom';

export default function Layout() {
  const location = useLocation();

  return (
    <div className="app">
      <header className="header">
        <Link to="/dashboard" className="logo">
          Smart City
        </Link>
        <nav className="nav">
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
          <Link
            to="/report"
            className={`nav-report-btn${location.pathname === '/report' ? ' active' : ''}`}
          >
            Report Issue
          </Link>
        </nav>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
