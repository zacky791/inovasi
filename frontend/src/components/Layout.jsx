import { Outlet, Link, useLocation } from 'react-router-dom';

export default function Layout() {
  const location = useLocation();

  return (
    <div className="app">
      <header className="header">
        <Link to="/" className="logo">
          Smart City
        </Link>
        <nav className="nav">
          <Link to="/report" className={location.pathname === '/report' ? 'active' : ''}>
            Report Issue
          </Link>
          <Link to="/dashboard" className={location.pathname === '/dashboard' ? 'active' : ''}>
            Dashboard
          </Link>
          <Link to="/sensors" className={location.pathname === '/sensors' ? 'active' : ''}>
            Sensors
          </Link>
        </nav>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
