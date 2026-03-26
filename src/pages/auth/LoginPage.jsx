import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, ArrowRight } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
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
    setLoading(true)
    try {
      await signIn({ email, password })
      setTimeout(() => { setLoading(false); navigate('/', { replace: true }) }, 3000)
    } catch (err) {
      setError(err.message || 'Failed to sign in')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Top accent bar */}
      <div className="h-1.5 bg-primary" />

      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-[360px]">
          {/* Logo */}
          <div className="mb-10">
            <img src="/logo.png" alt="SafeRide Kids" className="h-40 w-auto mb-5" />
            <h1 className="text-[28px] font-bold text-text-primary tracking-tight leading-tight">
              Welcome back
            </h1>
            <p className="text-text-secondary text-[15px] mt-1">Sign in to SafeRide Kids</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-danger/5 text-danger text-sm font-medium p-3.5 rounded-xl border border-danger/10">{error}</div>
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

            <div className="pt-1">
              <Button type="submit" fullWidth size="lg" loading={loading}>
                Sign In <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-text-secondary">
              New here?{' '}
              <Link to="/register" className="text-primary font-semibold">
                Create an account
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className="text-center pb-6">
        <Link to="/" className="text-xs text-text-muted">Back to home</Link>
      </div>
    </div>
  )
}
