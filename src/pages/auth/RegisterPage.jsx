import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, User, Phone, Shield, RefreshCw, CheckCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { ROLES, validatePassword } from '../../lib/constants'

export default function RegisterPage() {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: ROLES.PARENT,
  })
  const [showConsent, setShowConsent] = useState(false)
  const [consentAccepted, setConsentAccepted] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  function updateForm(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function handleContinue(e) {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    const passwordError = validatePassword(form.password)
    if (passwordError) {
      setError(passwordError)
      return
    }
    setShowConsent(true)
  }

  async function handleRegister() {
    if (!consentAccepted) return
    setLoading(true)
    setError('')

    try {
      const data = await signUp({
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        role: form.role,
        phone: form.phone,
      })
      if (data?.user && !data?.session) {
        setShowConfirmation(true)
      } else {
        navigate(form.role === ROLES.PARENT ? '/parent' : '/driver/onboarding')
      }
    } catch (err) {
      setError(err.message || 'Registration failed')
      setShowConsent(false)
    } finally {
      setLoading(false)
    }
  }

  async function handleResendConfirmation() {
    setResending(true)
    setResendSuccess(false)
    try {
      const { error: resendErr } = await supabase.auth.resend({
        type: 'signup',
        email: form.email,
      })
      if (resendErr) throw resendErr
      setResendSuccess(true)
    } catch (err) {
      setError(err.message || 'Failed to resend confirmation email')
    } finally {
      setResending(false)
    }
  }

  if (showConfirmation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/30 flex flex-col items-center justify-center px-5">
        <div className="w-full max-w-[380px]">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Check your email</h2>
            <p className="text-gray-500 mb-1">We sent a confirmation link to</p>
            <p className="font-semibold text-gray-900 mb-6">{form.email}</p>
            <p className="text-sm text-gray-400 mb-8">
              Click the link in the email to verify your account. Check your spam folder if you don't see it.
            </p>

            {resendSuccess && (
              <div className="bg-emerald-50 text-emerald-700 text-sm font-medium p-3.5 rounded-xl border border-emerald-100 mb-4">
                Confirmation email resent!
              </div>
            )}

            {error && (
              <div className="bg-red-50 text-red-600 text-sm font-medium p-3.5 rounded-xl border border-red-100 mb-4">{error}</div>
            )}

            <button
              onClick={handleResendConfirmation}
              disabled={resending}
              className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 bg-primary/5 hover:bg-primary/10 p-3.5 rounded-xl border border-primary/10 transition-all disabled:opacity-50 mb-4"
            >
              <RefreshCw className={`h-4 w-4 ${resending ? 'animate-spin' : ''}`} />
              {resending ? 'Sending...' : 'Resend confirmation email'}
            </button>

            <Link
              to="/login"
              className="block w-full text-center text-sm font-medium text-gray-400 hover:text-gray-600 py-3 transition-colors"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (showConsent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/30 flex flex-col items-center justify-center px-5">
        <div className="w-full max-w-[420px]">
          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-xl font-extrabold text-gray-900">POPIA Consent</h2>
            <p className="text-gray-500 text-sm mt-1">Protection of Personal Information Act</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6 max-h-64 overflow-y-auto text-sm text-gray-500 space-y-3">
            <p className="font-medium text-gray-900">SafeRide Kids collects and processes your personal information to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Provide real-time GPS tracking of your child's school transport</li>
              <li>Send push notifications about trip events (pickup, drop-off, arrival)</li>
              <li>Enable communication between parents and drivers</li>
              <li>Process subscription payments via PayFast</li>
              <li>Ensure the safety of children during transport</li>
            </ul>
            <p className="font-medium text-gray-900">Data we collect:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Your name, email address, and phone number</li>
              <li>Your child's name, school, and grade</li>
              <li>GPS location data during active trips (drivers only)</li>
              <li>In-app messages between parents and drivers</li>
            </ul>
            <p className="font-medium text-gray-900">Your rights under POPIA:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Access your data at any time via the app</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and all associated data</li>
              <li>Object to certain data processing activities</li>
            </ul>
            <p>Trip position data is retained for 90 days, then automatically purged. Contact <span className="text-primary font-medium">privacy@kelyratech.co.za</span> for data requests.</p>
          </div>

          <label className="flex items-start gap-3 mb-6 cursor-pointer">
            <input
              type="checkbox"
              checked={consentAccepted}
              onChange={(e) => setConsentAccepted(e.target.checked)}
              className="mt-0.5 h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span className="text-sm text-gray-700">
              I have read and agree to the SafeRide Kids{' '}
              <span className="text-primary font-medium">Privacy Policy</span> and{' '}
              <span className="text-primary font-medium">Terms & Conditions</span>.
              I consent to the collection and processing of my personal information as described above.
            </span>
          </label>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4 border border-red-100">{error}</div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowConsent(false)} fullWidth>
              Back
            </Button>
            <Button
              onClick={handleRegister}
              disabled={!consentAccepted}
              loading={loading}
              fullWidth
            >
              I Agree & Register
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/30 flex flex-col items-center justify-center px-5 py-8">
      <div className="w-full max-w-[380px]">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="SafeRide Kids" className="h-28 w-auto mx-auto mb-6" />
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Create Account</h1>
          <p className="text-gray-500 mt-2">Join SafeRide Kids today</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <form onSubmit={handleContinue} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm font-medium p-3 rounded-xl border border-red-100">{error}</div>
            )}

            <div className="flex gap-1.5 p-1 bg-gray-100 rounded-xl">
              {[
                { role: ROLES.PARENT, label: 'Parent' },
                { role: ROLES.DRIVER, label: 'Driver' },
              ].map(({ role, label }) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => updateForm('role', role)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    form.role === role
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <Input
              label="Full Name"
              icon={User}
              placeholder="Your full name"
              value={form.fullName}
              onChange={(e) => updateForm('fullName', e.target.value)}
              required
            />

            <Input
              label="Email"
              type="email"
              icon={Mail}
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => updateForm('email', e.target.value)}
              required
            />

            <Input
              label="Phone (optional)"
              type="tel"
              icon={Phone}
              placeholder="+27 XX XXX XXXX"
              value={form.phone}
              onChange={(e) => updateForm('phone', e.target.value)}
            />

            <Input
              label="Password"
              type="password"
              icon={Lock}
              placeholder="Min 8 characters (A-z, 0-9)"
              value={form.password}
              onChange={(e) => updateForm('password', e.target.value)}
              required
            />

            <Input
              label="Confirm Password"
              type="password"
              icon={Lock}
              placeholder="Confirm your password"
              value={form.confirmPassword}
              onChange={(e) => updateForm('confirmPassword', e.target.value)}
              required
            />

            <Button type="submit" fullWidth size="lg">
              Continue
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-8">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-semibold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}
