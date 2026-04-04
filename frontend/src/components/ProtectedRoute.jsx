import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'

const getUser = () => {
  try {
    const raw = localStorage.getItem('user')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.token ? parsed : null
  } catch {
    localStorage.removeItem('user')
    return null
  }
}

/**
 * ProtectedRoute — requires a valid auth token.
 * If no token → redirect to /login, preserving the attempted URL.
 */
const ProtectedRoute = ({ children }) => {
  const location = useLocation()
  const user = getUser()
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return children
}

/**
 * AdminRoute — requires a valid token AND role === 'admin'.
 * Non-admins are redirected to /dashboard instead of /login.
 */
export const AdminRoute = ({ children }) => {
  const location = useLocation()
  const user = getUser()
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  if (user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

export default ProtectedRoute
