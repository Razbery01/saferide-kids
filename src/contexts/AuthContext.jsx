import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code === 'PGRST116') {
        // No profile row exists — create one from auth metadata
        const { data: { user: authUser } } = await supabase.auth.getUser()
        const meta = authUser?.user_metadata || {}
        const trialEnd = new Date()
        trialEnd.setDate(trialEnd.getDate() + 7)

        const newProfile = {
          id: userId,
          email: authUser?.email,
          full_name: meta.full_name || meta.name || authUser?.email?.split('@')[0] || 'User',
          role: meta.role || 'parent',
          phone: meta.phone || null,
          subscription_tier: 'trial',
          trial_ends_at: trialEnd.toISOString(),
          is_active: true,
        }

        // Try direct insert first, fall back to RPC
        const { data: inserted, error: insertErr } = await supabase
          .from('users')
          .insert(newProfile)
          .select()
          .single()

        if (insertErr) {
          const { error: rpcErr } = await supabase.rpc('create_user_profile', {
            user_id: newProfile.id,
            user_email: newProfile.email,
            user_full_name: newProfile.full_name,
            user_role: newProfile.role,
            user_phone: newProfile.phone,
            user_trial_ends_at: newProfile.trial_ends_at,
          })
          if (rpcErr) throw rpcErr

          // Re-fetch after RPC insert
          const { data: refetched } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single()
          setProfile(refetched)
        } else {
          setProfile(inserted)
        }
      } else if (error) {
        throw error
      } else {
        setProfile(data)
      }
    } catch (err) {
      // Fallback: build profile from auth metadata so login doesn't hang
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser) {
          const meta = authUser.user_metadata || {}
          setProfile({
            id: authUser.id,
            email: authUser.email,
            full_name: meta.full_name || meta.name || authUser.email?.split('@')[0] || 'User',
            role: meta.role || 'parent',
            subscription_tier: 'trial',
            is_active: true,
          })
        } else {
          setProfile(null)
        }
      } catch {
        setProfile(null)
      }
    } finally {
      setLoading(false)
    }
  }

  async function signUp({ email, password, fullName, role, phone }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role } },
    })
    if (error) throw error

    if (data.session && data.user) {
      // Use the session returned by signUp so auth.uid() is available for RLS
      const trialEnd = new Date()
      trialEnd.setDate(trialEnd.getDate() + 7)

      const { error: profileError } = await supabase.from('users').insert({
        id: data.user.id,
        email,
        full_name: fullName,
        role,
        phone: phone || null,
        subscription_tier: 'trial',
        trial_ends_at: trialEnd.toISOString(),
        is_active: true,
      })
      if (profileError) throw profileError
    } else if (data.user && !data.session) {
      // Email confirmation is enabled — use a database function to create the profile
      const trialEnd = new Date()
      trialEnd.setDate(trialEnd.getDate() + 7)

      const { error: profileError } = await supabase.rpc('create_user_profile', {
        user_id: data.user.id,
        user_email: email,
        user_full_name: fullName,
        user_role: role,
        user_phone: phone || null,
        user_trial_ends_at: trialEnd.toISOString(),
      })
      if (profileError) throw profileError
    }

    return data
  }

  async function signIn({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUser(null)
    setProfile(null)
  }

  async function updateProfile(updates) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()
    if (error) throw error
    setProfile(data)
    return data
  }

  const value = {
    user,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    fetchProfile: () => user && fetchProfile(user.id),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
