import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthState {
  user: User | null
  session: Session | null
  /** true while the initial session is being restored */
  isLoading: boolean
  /** true only after the first getSession() has resolved */
  isInitialized: boolean
  error: string | null

  initialize: () => Promise<void>
  signUp: (email: string, password: string) => Promise<{ needsConfirmation: boolean }>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: true,
  isInitialized: false,
  error: null,

  initialize: async () => {
    if (get().isInitialized) return
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase.auth.getSession()
      if (error) throw error
      set({
        session: data.session,
        user: data.session?.user ?? null,
        isLoading: false,
        isInitialized: true,
      })

      // Keep store in sync with auth changes
      supabase.auth.onAuthStateChange((_event, session) => {
        set({
          session,
          user: session?.user ?? null,
          isLoading: false,
        })
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to restore session'
      set({
        user: null,
        session: null,
        isLoading: false,
        isInitialized: true,
        error: message,
      })
    }
  },

  signUp: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      })
      if (error) throw error

      // If email confirmation is required, session may be null
      const needsConfirmation = !data.session
      set({
        session: data.session,
        user: data.user,
        isLoading: false,
      })
      return { needsConfirmation }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed'
      set({ isLoading: false, error: message })
      throw err
    }
  },

  signIn: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (error) throw error
      set({
        session: data.session,
        user: data.user,
        isLoading: false,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      set({ isLoading: false, error: message })
      throw err
    }
  },

  signOut: async () => {
    set({ isLoading: true, error: null })
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      set({
        user: null,
        session: null,
        isLoading: false,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Logout failed'
      set({ isLoading: false, error: message })
      throw err
    }
  },

  clearError: () => set({ error: null }),
}))
