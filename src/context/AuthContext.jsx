import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const TRIAL_DAYS = 30

function computeTrialStatus(user) {
  if (!user) return null
  const meta = user.user_metadata || {}

  if (meta.plan === 'paid') return { status: 'active' }

  const startedAt = meta.trial_started_at ? new Date(meta.trial_started_at) : new Date()
  const daysElapsed = Math.floor((Date.now() - startedAt) / 86_400_000)
  const daysLeft = Math.max(0, TRIAL_DAYS - daysElapsed)
  const pdfCount = meta.pdf_count || 0

  if (daysLeft === 0) {
    return { status: 'expired', daysLeft, pdfCount }
  }

  return { status: 'trial', daysLeft, pdfCount }
}

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,         setUser]         = useState(undefined) // undefined = loading
  const [trialStatus,  setTrialStatus]  = useState(null)

  const refresh = useCallback((session) => {
    const u = session?.user ?? null
    setUser(u)
    setTrialStatus(computeTrialStatus(u))
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setUser(null)
      return
    }

    supabase.auth.getSession().then(({ data }) => refresh(data.session))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      refresh(session)
    })

    return () => subscription.unsubscribe()
  }, [refresh])

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signUp = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          trial_started_at: new Date().toISOString(),
          pdf_count: 0,
          plan: 'trial',
        },
      },
    })
    if (error) throw error
    return data
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const refreshTrial = useCallback(async () => {
    if (!isSupabaseConfigured) return
    const { data } = await supabase.auth.getUser()
    if (data?.user) {
      setUser(data.user)
      setTrialStatus(computeTrialStatus(data.user))
    }
  }, [])

  const trackPDF = useCallback(async () => {
    if (!isSupabaseConfigured) return { allowed: true }

    const { data: fresh } = await supabase.auth.getUser()
    const freshUser = fresh?.user
    if (!freshUser) return { allowed: true }

    const meta = freshUser.user_metadata || {}
    if (meta.plan === 'paid') return { allowed: true }

    const currentCount = meta.pdf_count || 0
    setUser(freshUser)
    setTrialStatus(computeTrialStatus(freshUser))

    const newCount = currentCount + 1
    const { data, error } = await supabase.auth.updateUser({
      data: { pdf_count: newCount },
    })

    if (!error && data?.user) {
      setUser(data.user)
      setTrialStatus(computeTrialStatus(data.user))
    }

    return { allowed: true, pdfCount: newCount }
  }, [])

  const resetPassword = useCallback(async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    if (error) throw error
  }, [])

  return (
    <AuthContext.Provider value={{ user, trialStatus, signIn, signUp, signOut, trackPDF, refreshTrial, resetPassword }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
