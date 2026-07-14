import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from '../pages/LandingPage';
import ReportPage from '../pages/ReportPage';
import DashboardPage from '../pages/DashboardPage';
import SensorDashboardPage from '../pages/SensorDashboardPage';
import Layout from '../components/Layout';

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/sensors" element={<SensorDashboardPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
