import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { FullPageLoader } from '../ui/LoadingSpinner'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, profile, loading } = useAuth()

  if (loading) return <FullPageLoader />
  if (!user) return <Navigate to="/login" replace />
  if (!profile) return <FullPageLoader />
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    const redirectMap = { parent: '/parent', driver: '/driver', admin: '/admin' }
    return <Navigate to={redirectMap[profile.role] || '/login'} replace />
  }

  return children
}
