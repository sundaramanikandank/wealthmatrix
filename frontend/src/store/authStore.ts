import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { Session } from '@supabase/supabase-js'

interface User {
  id: string
  email: string
  name?: string
}

interface AuthState {
  user: User | null
  session: Session | null
  isLoading: boolean
  setUser: (user: User | null) => void
  setSession: (session: Session | null) => void
  logout: () => Promise<void>
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isLoading: true,
  
  setUser: (user) => set({ user }),
  
  setSession: (session) => set({ session }),
  
  logout: async () => {
    await supabase.auth.signOut()
    set({ user: null, session: null })
  },
  
  initialize: async () => {
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        set({
          user: {
            id: session.user.id,
            email: session.user.email!,
            name: session.user.user_metadata?.name,
          },
          session,
          isLoading: false,
        })
      } else {
        set({ user: null, session: null, isLoading: false })
      }
      
      // Set up auth state listener
      supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          set({
            user: {
              id: session.user.id,
              email: session.user.email!,
              name: session.user.user_metadata?.name,
            },
            session,
          })
        } else {
          set({ user: null, session: null })
        }
      })
    } catch (error) {
      console.error('Failed to initialize auth:', error)
      set({ isLoading: false })
    }
  },
}))

// Initialize auth on app load
useAuthStore.getState().initialize()
