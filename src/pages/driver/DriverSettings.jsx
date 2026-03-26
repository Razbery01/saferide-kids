import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import Card, { CardTitle } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import { User, Car, CreditCard, Shield, Trash2, Copy, CheckCircle, Lock, Mail, Save } from 'lucide-react'
import { SUBSCRIPTION_PRICES } from '../../lib/constants'
import { initiatePayment, PLAN_DETAILS } from '../../lib/payfast'

export default function DriverSettings() {
  const { profile, signOut } = useAuth()
  const [driverInfo, setDriverInfo] = useState(null)
  const [codeCopied, setCodeCopied] = useState(false)
  const [vehicleForm, setVehicleForm] = useState({ vehicle_registration: '', vehicle_description: '' })
  const [vehicleSaving, setVehicleSaving] = useState(false)
  const [vehicleSaved, setVehicleSaved] = useState(false)
  const [vehicleError, setVehicleError] = useState('')
  const [upgrading, setUpgrading] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [showChangeEmail, setShowChangeEmail] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current: '', newPassword: '', confirm: '' })
  const [emailForm, setEmailForm] = useState({ newEmail: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notification, setNotification] = useState('')

  useEffect(() => {
    if (profile) {
      supabase.from('drivers').select('*').eq('id', profile.id).single()
        .then(({ data }) => {
          setDriverInfo(data)
          if (data) {
            setVehicleForm({
              vehicle_registration: data.vehicle_registration || '',
              vehicle_description: data.vehicle_description || '',
            })
          }
        })
    }
  }, [profile])

  async function handleSaveVehicle(e) {
    e.preventDefault()
    setVehicleSaving(true)
    setVehicleError('')
    setVehicleSaved(false)
    try {
      const { error } = await supabase.from('drivers').update({
        vehicle_registration: vehicleForm.vehicle_registration,
        vehicle_description: vehicleForm.vehicle_description,
      }).eq('id', profile.id)
      if (error) throw error
      setDriverInfo(prev => ({ ...prev, ...vehicleForm }))
      setVehicleSaved(true)
      setTimeout(() => setVehicleSaved(false), 2000)
    } catch (err) {
      setVehicleError(err.message)
    } finally {
      setVehicleSaving(false)
    }
  }

  async function handleUpgrade() {
    setUpgrading(true)
    try {
      await initiatePayment({ plan: 'driver_pro', user: profile })
    } catch (err) {
      setVehicleError(err.message)
      setUpgrading(false)
    }
  }

  function copyCode() {
    navigator.clipboard.writeText(driverInfo?.route_code || '')
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  async function handleChangePassword(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (passwordForm.newPassword !== passwordForm.confirm) {
        throw new Error('New passwords do not match.')
      }
      if (passwordForm.newPassword.length < 6) {
        throw new Error('Password must be at least 6 characters.')
      }
      const { error } = await supabase.auth.updateUser({ password: passwordForm.newPassword })
      if (error) throw error
      setShowChangePassword(false)
      setPasswordForm({ current: '', newPassword: '', confirm: '' })
      setNotification('Password updated successfully.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleChangeEmail(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (!emailForm.newEmail) throw new Error('Please enter a new email address.')
      const { error } = await supabase.auth.updateUser({ email: emailForm.newEmail })
      if (error) throw error
      setShowChangeEmail(false)
      setEmailForm({ newEmail: '' })
      setNotification('Confirmation email sent to your new address. Please check your inbox.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardTitle>Profile</CardTitle>
        <div className="flex items-center gap-3 mt-3">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-semibold">{profile?.full_name}</p>
            <p className="text-sm text-text-secondary">{profile?.email}</p>
            <Badge variant={driverInfo?.verification_status === 'approved' ? 'success' : 'warning'} className="mt-1">
              {driverInfo?.verification_status || 'pending'}
            </Badge>
          </div>
        </div>
      </Card>

      {driverInfo && (
        <>
          <Card>
            <CardTitle>Vehicle Details</CardTitle>
            <form onSubmit={handleSaveVehicle} className="mt-3 space-y-3">
              {vehicleError && <p className="text-sm text-danger">{vehicleError}</p>}
              <Input
                label="Vehicle Registration"
                value={vehicleForm.vehicle_registration}
                onChange={e => setVehicleForm(f => ({ ...f, vehicle_registration: e.target.value }))}
                placeholder="e.g. CA 123-456"
              />
              <Input
                label="Vehicle Description"
                value={vehicleForm.vehicle_description}
                onChange={e => setVehicleForm(f => ({ ...f, vehicle_description: e.target.value }))}
                placeholder="e.g. White Toyota HiAce 2021"
              />
              <Button type="submit" size="sm" loading={vehicleSaving}>
                {vehicleSaved ? <><CheckCircle className="h-4 w-4" /> Saved</> : <><Save className="h-4 w-4" /> Save Changes</>}
              </Button>
            </form>
          </Card>

          <Card>
            <CardTitle>Route Code</CardTitle>
            <div className="flex items-center gap-3 mt-3">
              <span className="text-2xl font-bold text-primary tracking-widest">{driverInfo.route_code}</span>
              <button onClick={copyCode} className="p-2 rounded-lg hover:bg-gray-100 transition">
                {codeCopied ? <CheckCircle className="h-5 w-5 text-success" /> : <Copy className="h-5 w-5 text-text-secondary" />}
              </button>
            </div>
            <p className="text-xs text-text-secondary mt-1">Share this code with parents.</p>
          </Card>
        </>
      )}

      <Card>
        <CardTitle>Subscription</CardTitle>
        <div className="mt-3 space-y-3">
          <div className="p-3 rounded-xl border border-primary bg-primary/5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">
                  {profile?.subscription_tier === 'driver_pro' ? 'Driver Pro' : profile?.subscription_tier === 'trial' ? 'Free Trial' : profile?.subscription_tier || 'Trial'}
                </p>
                <p className="text-xs text-text-secondary">
                  {profile?.subscription_tier === 'driver_pro' ? 'Full driver features' : 'Limited features'}
                </p>
              </div>
              <p className="font-bold text-primary">R{SUBSCRIPTION_PRICES.driver_pro.amount}/mo</p>
            </div>
          </div>
          {profile?.subscription_tier !== 'driver_pro' && (
            <Button onClick={handleUpgrade} loading={upgrading} fullWidth variant="primary">
              <CreditCard className="h-4 w-4" /> Upgrade to Driver Pro
            </Button>
          )}
          {profile?.subscription_tier === 'driver_pro' && (
            <Badge variant="success" dot>Active subscription</Badge>
          )}
        </div>
      </Card>

      {/* Account Security */}
      <Card>
        <CardTitle>Account Security</CardTitle>
        <div className="mt-3 space-y-2">
          <button
            onClick={() => { setShowChangePassword(true); setError('') }}
            className="w-full text-left text-sm p-2.5 rounded-xl hover:bg-gray-50 transition flex items-center gap-2.5"
          >
            <Lock className="h-4 w-4 text-text-secondary" /> Change Password
          </button>
          <button
            onClick={() => { setShowChangeEmail(true); setError('') }}
            className="w-full text-left text-sm p-2.5 rounded-xl hover:bg-gray-50 transition flex items-center gap-2.5"
          >
            <Mail className="h-4 w-4 text-text-secondary" /> Change Email
          </button>
        </div>
      </Card>

      <Card>
        <CardTitle>Privacy & Data</CardTitle>
        <div className="mt-3 space-y-2">
          <button className="w-full text-left text-sm p-2 rounded-lg hover:bg-gray-50 transition flex items-center gap-2">
            <Shield className="h-4 w-4 text-text-secondary" /> Privacy Policy & Terms
          </button>
          <button className="w-full text-left text-sm text-danger p-2 rounded-lg hover:bg-red-50 transition flex items-center gap-2">
            <Trash2 className="h-4 w-4" /> Request Account Deletion
          </button>
        </div>
      </Card>

      <Button variant="outline" fullWidth onClick={signOut}>Sign Out</Button>

      {/* Change Password Modal */}
      <Modal isOpen={showChangePassword} onClose={() => { setShowChangePassword(false); setError('') }} title="Change Password">
        <form onSubmit={handleChangePassword} className="space-y-4">
          {error && <p className="text-sm text-danger">{error}</p>}
          <Input label="Current Password" type="password" value={passwordForm.current} onChange={(e) => setPasswordForm(f => ({...f, current: e.target.value}))} required />
          <Input label="New Password" type="password" value={passwordForm.newPassword} onChange={(e) => setPasswordForm(f => ({...f, newPassword: e.target.value}))} required />
          <Input label="Confirm New Password" type="password" value={passwordForm.confirm} onChange={(e) => setPasswordForm(f => ({...f, confirm: e.target.value}))} required />
          <Button type="submit" fullWidth loading={saving}>Update Password</Button>
        </form>
      </Modal>

      {/* Change Email Modal */}
      <Modal isOpen={showChangeEmail} onClose={() => { setShowChangeEmail(false); setError('') }} title="Change Email">
        <form onSubmit={handleChangeEmail} className="space-y-4">
          {error && <p className="text-sm text-danger">{error}</p>}
          <p className="text-sm text-text-secondary">A confirmation email will be sent to your new address.</p>
          <Input label="New Email Address" type="email" value={emailForm.newEmail} onChange={(e) => setEmailForm({ newEmail: e.target.value })} required />
          <Button type="submit" fullWidth loading={saving}>Update Email</Button>
        </form>
      </Modal>

      {/* Notification toast */}
      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium animate-in">
          {notification}
          <button onClick={() => setNotification('')} className="ml-3 text-white/60 hover:text-white">&#10005;</button>
        </div>
      )}
    </div>
  )
}
