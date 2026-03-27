import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (resetErr) throw resetErr
      setSent(true)
    } catch (err) {
      setError(err.message || 'Failed to send reset email. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/30 flex flex-col items-center justify-center px-5">
        <div className="w-full max-w-[380px]">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">Check your email</h2>
            <p className="text-gray-500 mb-1">We sent a password reset link to</p>
            <p className="font-semibold text-gray-900 mb-6">{email}</p>
            <p className="text-sm text-gray-400 mb-8">
              Click the link in the email to set a new password. Check your spam folder if you don't see it.
            </p>
            <Link to="/login" className="block">
              <Button variant="outline" fullWidth>
                <ArrowLeft className="h-4 w-4" /> Back to Sign In
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50/30 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-[380px]">
          <div className="text-center mb-8">
            <img src="/logo.png" alt="SafeRide Kids" className="h-28 w-auto mx-auto mb-6" />
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Reset password</h1>
            <p className="text-gray-500 mt-2">Enter your email and we'll send you a reset link</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 text-red-600 text-sm font-medium p-3.5 rounded-xl border border-red-100">
                  {error}
                </div>
              )}

              <Input
                label="Email"
                type="email"
                icon={Mail}
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />

              <Button type="submit" fullWidth size="lg" loading={loading}>
                Send Reset Link
              </Button>
            </form>
          </div>

          <div className="mt-8 text-center">
            <Link to="/login" className="text-sm text-gray-500 hover:text-gray-700 inline-flex items-center gap-1">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
