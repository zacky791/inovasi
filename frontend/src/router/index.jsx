import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ReportPage from '../pages/ReportPage';
import DashboardPage from '../pages/DashboardPage';
import ReportsPage from '../pages/ReportsPage';
import Layout from '../components/Layout';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="/dashboard" element={<ReportsPage />} />
          <Route path="/reports" element={<DashboardPage />} />
          <Route path="/sensors" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
