import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { FullPageLoader } from './components/ui/LoadingSpinner'
import { initFirebase, requestNotificationPermission, onPushMessage } from './lib/firebase'
import ProtectedRoute from './components/layout/ProtectedRoute'
import MobileLayout from './components/layout/MobileLayout'
import AdminLayout from './components/layout/AdminLayout'

// Landing page
import LandingPage from './pages/LandingPage'

// Auth pages
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'

// Parent pages
import ParentDashboard from './pages/parent/Dashboard'
import LiveTracking from './pages/parent/LiveTracking'
import TripHistory from './pages/parent/TripHistory'
import ParentMessages from './pages/parent/Messages'
import ParentSettings from './pages/parent/Settings'

// Driver pages
import DriverDashboard from './pages/driver/DriverDashboard'
import DriverOnboarding from './pages/driver/DriverOnboarding'
import ActiveTrip from './pages/driver/ActiveTrip'
import DriverRoutes from './pages/driver/Routes'
import DriverTrips from './pages/driver/DriverTrips'
import DriverMessages from './pages/driver/DriverMessages'
import DriverSettings from './pages/driver/DriverSettings'

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard'
import UserManagement from './pages/admin/UserManagement'
import DriverApprovals from './pages/admin/DriverApprovals'
import LiveTrips from './pages/admin/LiveTrips'
import SafetyReports from './pages/admin/SafetyReports'
import Subscriptions from './pages/admin/Subscriptions'
import Reports from './pages/admin/Reports'

function HomeRoute() {
  const { user, profile, loading } = useAuth()
  if (loading) return <FullPageLoader />
  if (!user) return <LandingPage />
  if (!profile) return <FullPageLoader />
  const redirectMap = { parent: '/parent', driver: '/driver', admin: '/admin' }
  return <Navigate to={redirectMap[profile.role] || '/parent'} replace />
}

function NotificationInit() {
  const { user } = useAuth()

  useEffect(() => {
    initFirebase()
  }, [])

  useEffect(() => {
    if (user?.id) {
      requestNotificationPermission(user.id)
      const unsub = onPushMessage((payload) => {
        console.log('Push notification received:', payload)
      })
      return unsub
    }
  }, [user?.id])

  return null
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationInit />
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Root — landing page or role redirect */}
          <Route path="/" element={<HomeRoute />} />

          {/* Parent routes */}
          <Route
            path="/parent"
            element={
              <ProtectedRoute allowedRoles={['parent']}>
                <MobileLayout title="SafeRide Kids" />
              </ProtectedRoute>
            }
          >
            <Route index element={<ParentDashboard />} />
            <Route path="tracking" element={<LiveTracking />} />
            <Route path="trips" element={<TripHistory />} />
            <Route path="messages" element={<ParentMessages />} />
            <Route path="settings" element={<ParentSettings />} />
          </Route>

          {/* Driver routes */}
          <Route
            path="/driver"
            element={
              <ProtectedRoute allowedRoles={['driver']}>
                <MobileLayout title="SafeRide Driver" />
              </ProtectedRoute>
            }
          >
            <Route index element={<DriverDashboard />} />
            <Route path="trip" element={<ActiveTrip />} />
            <Route path="routes" element={<DriverRoutes />} />
            <Route path="trips" element={<DriverTrips />} />
            <Route path="messages" element={<DriverMessages />} />
            <Route path="settings" element={<DriverSettings />} />
          </Route>
          <Route
            path="/driver/onboarding"
            element={
              <ProtectedRoute allowedRoles={['driver']}>
                <DriverOnboarding />
              </ProtectedRoute>
            }
          />

          {/* Admin routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="drivers" element={<DriverApprovals />} />
            <Route path="trips" element={<LiveTrips />} />
            <Route path="safety" element={<SafetyReports />} />
            <Route path="subscriptions" element={<Subscriptions />} />
            <Route path="reports" element={<Reports />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
