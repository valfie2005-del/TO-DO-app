import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { CalendarDays, Flame, LayoutDashboard, LogOut } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { useUiStore } from '@/store/uiStore'
import { getLocalToday } from '@/utils/dates'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/today', label: 'Today', icon: LayoutDashboard },
  { to: '/challenges', label: 'Challenges', icon: Flame },
  { to: '/calendar', label: 'Calendar', icon: CalendarDays },
]

const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.2, ease: 'easeOut' },
}

export function AppShell() {
  const { user, signOut } = useAuthStore()
  const setSelectedDate = useUiStore((s) => s.setSelectedDate)
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    try {
      await signOut()
      setSelectedDate(getLocalToday())
      navigate('/login', { replace: true })
    } catch {
      // error surfaced via store if needed
    }
  }

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-2 focus:left-2 focus:rounded-lg focus:bg-[#2F6BFF] focus:px-3 focus:py-2 focus:text-white focus:text-sm"
      >
        Skip to content
      </a>

      {/* Desktop top nav */}
      <header className="sticky top-0 z-40 hidden md:flex items-center justify-between border-b border-[rgba(76,201,255,0.12)] bg-[#05070D]/80 backdrop-blur-md px-6 h-14">
        <div className="flex items-center gap-8">
          <span className="text-lg font-bold bg-gradient-to-r from-[#2F6BFF] to-[#4CC9FF] bg-clip-text text-transparent">
            40 Days
          </span>
          <nav className="flex items-center gap-1" aria-label="Main">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-gradient-to-r from-[#2F6BFF]/20 to-[#4CC9FF]/20 text-[#4CC9FF]'
                      : 'text-[#8B95B3] hover:text-[#E8ECF8] hover:bg-white/5'
                  )
                }
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-[#8B95B3] truncate max-w-[180px]" title={user?.email}>
            {user?.email}
          </span>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-[#8B95B3] hover:text-[#E8ECF8] transition-colors rounded-lg px-2 py-1.5 hover:bg-white/5"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Sign out
          </button>
        </div>
      </header>

      {/* Main content with page transitions */}
      <main id="main-content" className="flex-1 pb-20 md:pb-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={pageTransition.initial}
            animate={pageTransition.animate}
            exit={pageTransition.exit}
            transition={pageTransition.transition}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile bottom tab bar */}
      <nav
        className="fixed bottom-0 inset-x-0 z-40 md:hidden border-t border-[rgba(76,201,255,0.12)] bg-[#05070D]/90 backdrop-blur-md"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        aria-label="Main"
      >
        <div className="flex items-stretch h-14">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors min-h-[44px]',
                  isActive ? 'text-[#4CC9FF]' : 'text-[#8B95B3]'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="h-5 w-5" aria-hidden />
                  <span>{label}</span>
                  {isActive && (
                    <span className="sr-only">(current)</span>
                  )}
                </>
              )}
            </NavLink>
          ))}
          <button
            type="button"
            onClick={handleLogout}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium text-[#8B95B3] min-h-[44px]"
            aria-label="Sign out"
          >
            <LogOut className="h-5 w-5" aria-hidden />
            <span>Out</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
