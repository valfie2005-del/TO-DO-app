import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading, isInitialized } = useAuthStore()
  const location = useLocation()

  if (!isInitialized || isLoading) {
    return <AuthLoadingScreen />
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

export function AuthLoadingScreen() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4 bg-[#05070D]">
      <div className="h-10 w-10 rounded-full border-2 border-[#2F6BFF] border-t-transparent animate-spin" />
      <p className="text-sm text-[#8B95B3]">Loading…</p>
    </div>
  )
}

/** Redirect authenticated users away from auth pages */
export function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isInitialized } = useAuthStore()

  if (!isInitialized || isLoading) {
    return <AuthLoadingScreen />
  }

  if (user) {
    return <Navigate to="/today" replace />
  }

  return <>{children}</>
}
