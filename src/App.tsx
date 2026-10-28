import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { ProtectedRoute, PublicOnlyRoute, AuthLoadingScreen } from '@/components/auth/ProtectedRoute'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { TodayPage } from '@/pages/TodayPage'
import { ChallengesPage } from '@/pages/ChallengesPage'
import { CalendarPage } from '@/pages/CalendarPage'
import { ToastViewport } from '@/components/ui/Toast'

function App() {
  const initialize = useAuthStore((s) => s.initialize)
  const isInitialized = useAuthStore((s) => s.isInitialized)

  useEffect(() => {
    void initialize()
  }, [initialize])

  if (!isInitialized) {
    return <AuthLoadingScreen />
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnlyRoute>
              <RegisterPage />
            </PublicOnlyRoute>
          }
        />

        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/today" element={<TodayPage />} />
          <Route path="/challenges" element={<ChallengesPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
        </Route>

        <Route path="/" element={<Navigate to="/today" replace />} />
        <Route path="*" element={<Navigate to="/today" replace />} />
      </Routes>
      <ToastViewport />
    </BrowserRouter>
  )
}

export default App
