import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Mail, Lock, User, Phone, Shield } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { ROLES } from '../../lib/constants'

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
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setShowConsent(true)
  }

  async function handleRegister() {
    if (!consentAccepted) return
    setLoading(true)
    setError('')

    try {
      await signUp({
        email: form.email,
        password: form.password,
        fullName: form.fullName,
        role: form.role,
        phone: form.phone,
      })
      navigate(form.role === ROLES.PARENT ? '/parent' : '/driver/onboarding')
    } catch (err) {
      setError(err.message || 'Registration failed')
      setShowConsent(false)
    } finally {
      setLoading(false)
    }
  }

  if (showConsent) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-text-primary">POPIA Consent</h2>
            <p className="text-text-secondary text-sm mt-1">Protection of Personal Information Act</p>
          </div>

          <div className="bg-surface rounded-2xl border border-border p-5 mb-6 max-h-64 overflow-y-auto text-sm text-text-secondary space-y-3">
            <p className="font-medium text-text-primary">SafeRide Kids collects and processes your personal information to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Provide real-time GPS tracking of your child's school transport</li>
              <li>Send push notifications about trip events (pickup, drop-off, arrival)</li>
              <li>Enable communication between parents and drivers</li>
              <li>Process subscription payments via PayFast</li>
              <li>Ensure the safety of children during transport</li>
            </ul>
            <p className="font-medium text-text-primary">Data we collect:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Your name, email address, and phone number</li>
              <li>Your child's name, school, and grade</li>
              <li>GPS location data during active trips (drivers only)</li>
              <li>In-app messages between parents and drivers</li>
            </ul>
            <p className="font-medium text-text-primary">Your rights under POPIA:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Access your data at any time via the app</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and all associated data</li>
              <li>Object to certain data processing activities</li>
            </ul>
            <p>Trip position data is retained for 90 days, then automatically purged. Contact <span className="text-primary">privacy@kelyratech.co.za</span> for data requests.</p>
          </div>

          <label className="flex items-start gap-3 mb-6 cursor-pointer">
            <input
              type="checkbox"
              checked={consentAccepted}
              onChange={(e) => setConsentAccepted(e.target.checked)}
              className="mt-0.5 h-5 w-5 rounded border-border text-primary focus:ring-primary"
            />
            <span className="text-sm text-text-primary">
              I have read and agree to the SafeRide Kids{' '}
              <span className="text-primary font-medium">Privacy Policy</span> and{' '}
              <span className="text-primary font-medium">Terms & Conditions</span>.
              I consent to the collection and processing of my personal information as described above.
            </span>
          </label>

          {error && (
            <div className="bg-danger-light text-danger text-sm p-3 rounded-xl mb-4">{error}</div>
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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="SafeRide Kids" className="h-40 w-auto mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-text-primary">Create Account</h1>
          <p className="text-text-secondary mt-1">Join SafeRide Kids today</p>
        </div>

        <form onSubmit={handleContinue} className="space-y-4">
          {error && (
            <div className="bg-danger-light text-danger text-sm p-3 rounded-xl">{error}</div>
          )}

          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
            {[
              { role: ROLES.PARENT, label: 'Parent' },
              { role: ROLES.DRIVER, label: 'Driver' },
            ].map(({ role, label }) => (
              <button
                key={role}
                type="button"
                onClick={() => updateForm('role', role)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  form.role === role
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
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
            placeholder="Min 6 characters"
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

          <Button type="submit" fullWidth>
            Continue
          </Button>
        </form>

        <p className="text-center text-sm text-text-secondary mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-semibold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}
