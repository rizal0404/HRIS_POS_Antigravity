import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './Layout';
import ManagerLayout from './ManagerLayout';
import Home from './pages/Home';
import Attendance from './pages/Attendance';
import Report from './pages/Report';
import Request from './pages/Request';
import Schedule from './pages/Schedule';
import Profile from './pages/Profile';
import ManagerDashboard from './pages/ManagerDashboard';
import ManagerSchedule from './pages/ManagerSchedule';
import ManagerApprovals from './pages/ManagerApprovals';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Employee Routes (Protected) */}
        <Route element={<ProtectedRoute allowedRoles={['employee', 'manager', 'admin']} />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/attendance" element={<Attendance />} />
            <Route path="/report" element={<Report />} />
            <Route path="/request" element={<Request />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Route>

        {/* Manager Routes (Protected, Manager Only) */}
        <Route element={<ProtectedRoute allowedRoles={['manager', 'admin']} />}>
          <Route path="/manager" element={<ManagerLayout />}>
            <Route index element={<ManagerDashboard />} />
            <Route path="schedule" element={<ManagerSchedule />} />
            <Route path="approvals" element={<ManagerApprovals />} />
          </Route>
        </Route>

        {/* Authentication */}
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

