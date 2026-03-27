import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, ArrowRight, RefreshCw } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showResend, setShowResend] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const { signIn, user, profile } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user && profile) {
      const map = { parent: '/parent', driver: '/driver', admin: '/admin' }
      navigate(map[profile.role] || '/parent', { replace: true })
    }
  }, [user, profile, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setShowResend(false)
    setResendSuccess(false)
    setLoading(true)
    try {
      await signIn({ email, password })
      setTimeout(() => { setLoading(false); navigate('/', { replace: true }) }, 3000)
    } catch (err) {
      const msg = err.message || 'Failed to sign in'
      setError(msg)
      if (msg.toLowerCase().includes('email not confirmed')) {
        setShowResend(true)
      }
      setLoading(false)
    }
  }

  async function handleResendConfirmation() {
    setResending(true)
    setResendSuccess(false)
    try {
      const { error: resendErr } = await supabase.auth.resend({
        type: 'signup',
        email,
      })
      if (resendErr) throw resendErr
      setResendSuccess(true)
      setError('')
    } catch (err) {
      setError(err.message || 'Failed to resend confirmation email')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/30 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-[380px]">
          {/* Centered Logo */}
          <div className="text-center mb-10">
            <img src="/logo.png" alt="SafeRide Kids" className="h-28 w-auto mx-auto mb-6" />
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              Welcome back
            </h1>
            <p className="text-gray-500 text-[15px] mt-2">Sign in to your account</p>
          </div>

          {/* Card container */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 text-red-600 text-sm font-medium p-3.5 rounded-xl border border-red-100 flex items-start gap-2">
                  <span className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-red-100 flex items-center justify-center text-[10px] font-bold">!</span>
                  {error}
                </div>
              )}

              {resendSuccess && (
                <div className="bg-emerald-50 text-emerald-700 text-sm font-medium p-3.5 rounded-xl border border-emerald-100">
                  Confirmation email sent! Check your inbox and spam folder.
                </div>
              )}

              {showResend && !resendSuccess && (
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={resending}
                  className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 bg-primary/5 hover:bg-primary/10 p-3.5 rounded-xl border border-primary/10 transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${resending ? 'animate-spin' : ''}`} />
                  {resending ? 'Sending...' : 'Resend confirmation email'}
                </button>
              )}

              <Input
                label="Email"
                type="email"
                name="email"
                icon={Mail}
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />

              <Input
                label="Password"
                type="password"
                name="password"
                icon={Lock}
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />

              <Button type="submit" fullWidth size="lg" loading={loading}>
                Sign In <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <div className="mt-4 text-center">
              <Link to="/forgot-password" className="text-sm text-gray-400 hover:text-primary font-medium transition-colors">
                Forgot your password?
              </Link>
            </div>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              New here?{' '}
              <Link to="/register" className="text-primary font-semibold hover:underline">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className="text-center pb-6">
        <Link to="/" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Back to home</Link>
      </div>
    </div>
  )
}
