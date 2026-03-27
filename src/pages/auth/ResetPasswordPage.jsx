import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lock, CheckCircle, AlertTriangle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { validatePassword } from '../../lib/constants'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [sessionValid, setSessionValid] = useState(null)
  const navigate = useNavigate()

  // Supabase sets a session from the reset link's access_token in the URL hash
  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionValid(true)
      }
    })

    // Also check if we already have a session (user clicked link and was redirected)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setSessionValid(true)
      else setSessionValid(false)
    })
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    const passwordError = validatePassword(password)
    if (passwordError) {
      setError(passwordError)
      return
    }

    setLoading(true)
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password })
      if (updateErr) throw updateErr
      setSuccess(true)
      setTimeout(() => navigate('/login', { replace: true }), 3000)
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (sessionValid === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-text-secondary text-sm">Verifying reset link...</p>
      </div>
    )
  }

  if (sessionValid === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/30 flex flex-col items-center justify-center px-5">
        <div className="w-full max-w-[380px]">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <AlertTriangle className="h-8 w-8 text-amber-500" />
            </div>
            <h2 className="text-xl font-extrabold text-gray-900 mb-2">Link expired</h2>
            <p className="text-sm text-gray-500 mb-6">
              This password reset link has expired or is invalid. Please request a new one.
            </p>
            <Link to="/forgot-password">
              <Button fullWidth>Request New Link</Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/30 flex flex-col items-center justify-center px-5">
        <div className="w-full max-w-[380px]">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Password updated</h2>
            <p className="text-sm text-gray-500 mb-6">Redirecting you to sign in...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/30 flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-[380px]">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="SafeRide Kids" className="h-28 w-auto mx-auto mb-6" />
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">New password</h1>
          <p className="text-gray-500 mt-2">Enter your new password below</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm font-medium p-3.5 rounded-xl border border-red-100">
                {error}
              </div>
            )}

            <Input
              label="New Password"
              type="password"
              icon={Lock}
              placeholder="Min 8 characters (A-z, 0-9)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />

            <Input
              label="Confirm Password"
              type="password"
              icon={Lock}
              placeholder="Confirm your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />

            <Button type="submit" fullWidth size="lg" loading={loading}>
              Set New Password
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
