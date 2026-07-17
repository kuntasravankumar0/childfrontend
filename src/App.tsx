import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage        from './pages/LoginPage'
import Layout           from './components/Layout'
import DashboardPage    from './pages/DashboardPage'
import DevicesPage      from './pages/DevicesPage'
import DeviceDetailPage from './pages/DeviceDetailPage'
import ConfigurationsPage from './pages/ConfigurationsPage'
import ConfigDetailPage from './pages/ConfigDetailPage'
import UsersPage        from './pages/UsersPage'
import BackgroundAgentMode from './pages/BackgroundAgentMode'
import ContactsPage     from './pages/ContactsPage'
import CallLogsPage     from './pages/CallLogsPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />
}

function AppRoutes() {
  const { isAuthenticated } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={
        isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
      } />
      <Route path="/" element={
        <ProtectedRoute><Layout /></ProtectedRoute>
      }>
        <Route index             element={<DashboardPage />} />
        <Route path="devices"    element={<DevicesPage />} />
        <Route path="devices/:id" element={<DeviceDetailPage />} />
        <Route path="configurations" element={<ConfigurationsPage />} />
        <Route path="configurations/:id" element={<ConfigDetailPage />} />
        <Route path="background-agent" element={<BackgroundAgentMode />} />
        <Route path="messaging"  element={<Navigate to="/background-agent" replace />} />
        <Route path="users"      element={<UsersPage />} />
        <Route path="devices/:id/contacts" element={<ContactsPage />} />
        <Route path="devices/:id/calls"    element={<CallLogsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}
