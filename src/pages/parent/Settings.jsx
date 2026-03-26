import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { initiatePayment, PLAN_DETAILS } from '../../lib/payfast'
import Card, { CardTitle } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import { User, Plus, Trash2, Link2, CreditCard, Shield, Bell, Download, AlertTriangle, Phone, Lock, Mail } from 'lucide-react'
import { SPEED_THRESHOLD_DEFAULT, validateRouteCode } from '../../lib/constants'

export default function ParentSettings() {
  const { profile, signOut } = useAuth()
  const [children, setChildren] = useState([])
  const [showAddChild, setShowAddChild] = useState(false)
  const [showLinkRoute, setShowLinkRoute] = useState(false)
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const [linkChildId, setLinkChildId] = useState(null)
  const [childForm, setChildForm] = useState({ full_name: '', school_name: '', grade: '' })
  const [routeCode, setRouteCode] = useState('')
  const [speedThreshold, setSpeedThreshold] = useState(SPEED_THRESHOLD_DEFAULT)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notification, setNotification] = useState('')
  const [showRemoveChild, setShowRemoveChild] = useState(null)

  // Emergency contacts state
  const [emergencyContacts, setEmergencyContacts] = useState([])
  const [showAddContact, setShowAddContact] = useState(false)
  const [contactForm, setContactForm] = useState({ name: '', phone: '', relationship: '' })

  // Account security state
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [showChangeEmail, setShowChangeEmail] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ current: '', newPassword: '', confirm: '' })
  const [emailForm, setEmailForm] = useState({ newEmail: '' })

  // Notification preferences state
  const [notifPrefs, setNotifPrefs] = useState({
    trip_started: true,
    child_picked_up: true,
    child_dropped_off: true,
    at_school: true,
    speed_alert: true,
    route_deviation: true,
    approach_alert: true,
    broadcast_messages: true,
  })

  useEffect(() => { fetchChildren() }, [profile])

  // Check for payment return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('payment') === 'success') {
      setNotification('Payment successful! Your subscription has been upgraded.')
      window.history.replaceState({}, '', window.location.pathname)
    } else if (params.get('payment') === 'cancelled') {
      setNotification('Payment was cancelled.')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  async function fetchChildren() {
    if (!profile) return
    const { data } = await supabase
      .from('children')
      .select('*, child_route_assignments(route_id, routes(name))')
      .eq('parent_id', profile.id)
    setChildren(data || [])
  }

  async function handleAddChild(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const { error } = await supabase.from('children').insert({
        parent_id: profile.id,
        ...childForm,
      })
      if (error) throw error
      setShowAddChild(false)
      setChildForm({ full_name: '', school_name: '', grade: '' })
      fetchChildren()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleLinkRoute(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const trimmedCode = routeCode.trim().toUpperCase()
      const codeError = validateRouteCode(trimmedCode)
      if (codeError) throw new Error(codeError)

      const { data: driver, error: driverErr } = await supabase
        .from('drivers')
        .select('id, routes(id)')
        .eq('route_code', trimmedCode)
        .single()
      if (driverErr || !driver) throw new Error('Invalid route code. Please check with your driver.')
      const routeId = driver.routes?.[0]?.id
      if (!routeId) throw new Error('No routes found for this driver.')
      const { error: linkErr } = await supabase.from('child_route_assignments').insert({
        child_id: linkChildId,
        route_id: routeId,
        is_active: true,
      })
      if (linkErr) throw linkErr
      setShowLinkRoute(false)
      setRouteCode('')
      setLinkChildId(null)
      fetchChildren()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleRemoveChild(childId) {
    setShowRemoveChild(childId)
  }

  async function confirmRemoveChild() {
    const childId = showRemoveChild
    setShowRemoveChild(null)
    await supabase.from('child_route_assignments').delete().eq('child_id', childId)
    await supabase.from('children').delete().eq('id', childId)
    fetchChildren()
  }

  async function handleUpgrade(plan) {
    try {
      await initiatePayment({ plan, user: profile })
    } catch (err) {
      setNotification(err.message || 'Payment failed. Please try again.')
    }
  }

  async function handleDownloadData() {
    const { data: userData } = await supabase.from('users').select('*').eq('id', profile.id).single()
    const { data: childrenData } = await supabase.from('children').select('*').eq('parent_id', profile.id)

    const exportData = {
      profile: userData,
      children: childrenData,
      exported_at: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `saferide-kids-data-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleDeleteAccount() {
    await supabase.from('consent_records').insert({
      user_id: profile.id,
      consent_type: 'deletion_request',
      consent_version: '1.0',
    })

    // Call server-side deletion function if available, otherwise deactivate
    const { error: rpcErr } = await supabase.rpc('delete_user_data', { target_user_id: profile.id })
    if (rpcErr) {
      // Fallback: deactivate account
      await supabase.from('users').update({ is_active: false }).eq('id', profile.id)
    }

    setShowDeleteAccount(false)
    setNotification('Your account deletion request has been submitted. Your data will be purged within 48 hours as per POPIA requirements.')
    setTimeout(() => signOut(), 2000)
  }

  async function handleSaveSpeedThreshold() {
    const { error } = await supabase.auth.updateUser({
      data: { speed_threshold: speedThreshold }
    })
    if (error) { setNotification('Failed to save threshold.'); return }
    setNotification('Speed alert threshold updated.')
  }

  // Emergency contacts
  useEffect(() => { fetchEmergencyContacts() }, [profile])

  async function fetchEmergencyContacts() {
    if (!profile) return
    const { data } = await supabase
      .from('emergency_contacts')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at')
    setEmergencyContacts(data || [])
  }

  async function handleAddContact(e) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const { error } = await supabase.from('emergency_contacts').insert({
        user_id: profile.id,
        ...contactForm,
      })
      if (error) throw error
      setShowAddContact(false)
      setContactForm({ name: '', phone: '', relationship: '' })
      fetchEmergencyContacts()
      setNotification('Emergency contact added.')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteContact(contactId) {
    await supabase.from('emergency_contacts').delete().eq('id', contactId)
    fetchEmergencyContacts()
    setNotification('Emergency contact removed.')
  }

  // Account security
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

  // Notification preferences
  useEffect(() => { fetchNotifPrefs() }, [profile])

  async function fetchNotifPrefs() {
    if (!profile) return
    const { data } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', profile.id)
      .single()
    if (data) {
      const { user_id, updated_at, ...prefs } = data
      setNotifPrefs(prefs)
    }
  }

  async function handleToggleNotifPref(key) {
    const updated = { ...notifPrefs, [key]: !notifPrefs[key] }
    setNotifPrefs(updated)
    await supabase.from('notification_preferences').upsert({
      user_id: profile.id,
      ...updated,
      updated_at: new Date().toISOString(),
    })
  }

  return (
    <div className="space-y-4">
      {/* Profile */}
      <Card>
        <CardTitle>Profile</CardTitle>
        <div className="flex items-center gap-3 mt-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-emerald-100 rounded-2xl flex items-center justify-center">
            <User className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-text-primary">{profile?.full_name}</p>
            <p className="text-sm text-text-secondary">{profile?.email}</p>
          </div>
        </div>
      </Card>

      {/* Children */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <CardTitle>Children</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setShowAddChild(true)}>
            <Plus className="h-4 w-4" /> Add Child
          </Button>
        </div>
        {children.length === 0 ? (
          <p className="text-sm text-text-secondary">No children added yet.</p>
        ) : (
          <div className="space-y-3">
            {children.map(child => {
              const assignment = child.child_route_assignments?.[0]
              return (
                <div key={child.id} className="flex items-center gap-3 p-3 bg-background rounded-xl">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-emerald-100 rounded-xl flex items-center justify-center text-primary font-bold">
                    {child.full_name?.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{child.full_name}</p>
                    <p className="text-xs text-text-secondary">{child.school_name} {child.grade && `· Grade ${child.grade}`}</p>
                    {assignment ? (
                      <p className="text-xs text-primary mt-0.5">Linked to: {assignment.routes?.name}</p>
                    ) : (
                      <button
                        onClick={() => { setLinkChildId(child.id); setShowLinkRoute(true) }}
                        className="text-xs text-secondary font-semibold mt-0.5 flex items-center gap-1"
                      >
                        <Link2 className="h-3 w-3" /> Link to driver route
                      </button>
                    )}
                  </div>
                  <button onClick={() => handleRemoveChild(child.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-text-secondary hover:text-danger transition">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Subscription */}
      <Card>
        <CardTitle>Subscription</CardTitle>
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-text-secondary" />
            <span className="text-sm font-medium">Current plan: <Badge variant="primary">{profile?.subscription_tier || 'trial'}</Badge></span>
          </div>
          <div className="grid gap-2">
            {Object.entries(PLAN_DETAILS).filter(([k]) => k.startsWith('parent')).map(([key, plan]) => (
              <div key={key} className={`p-3 rounded-xl border ${
                profile?.subscription_tier === key ? 'border-primary bg-primary/5' : 'border-border'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">{plan.name}</p>
                    <p className="text-xs text-text-secondary">Monthly subscription</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-bold text-primary">R{plan.amount}/mo</p>
                    {profile?.subscription_tier !== key && (
                      <Button size="sm" onClick={() => handleUpgrade(key)}>Upgrade</Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Speed alerts */}
      <Card>
        <CardTitle>Speed Alerts</CardTitle>
        <div className="mt-3">
          <label className="text-sm text-text-secondary">Alert me if speed exceeds:</label>
          <input
            type="range" min="40" max="120" step="5"
            value={speedThreshold}
            onChange={(e) => setSpeedThreshold(Number(e.target.value))}
            className="w-full mt-2 accent-primary"
          />
          <div className="flex items-center justify-between mt-1">
            <p className="text-center text-sm font-bold text-primary">{speedThreshold} km/h</p>
            <Button size="sm" variant="outline" onClick={handleSaveSpeedThreshold}>Save</Button>
          </div>
        </div>
      </Card>

      {/* Emergency Contacts */}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <CardTitle>Emergency Contacts</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAddContact(true)}
            disabled={emergencyContacts.length >= 3}
          >
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
        <p className="text-xs text-text-secondary mb-3">Used by the SOS button. Max 3 contacts.</p>
        {emergencyContacts.length === 0 ? (
          <p className="text-sm text-text-secondary">No emergency contacts added yet.</p>
        ) : (
          <div className="space-y-2">
            {emergencyContacts.map(contact => (
              <div key={contact.id} className="flex items-center gap-3 p-3 bg-background rounded-xl">
                <div className="w-10 h-10 bg-gradient-to-br from-red-100 to-red-50 rounded-xl flex items-center justify-center">
                  <Phone className="h-4 w-4 text-danger" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{contact.name}</p>
                  <p className="text-xs text-text-secondary">{contact.phone}</p>
                  {contact.relationship && (
                    <p className="text-xs text-text-secondary">{contact.relationship}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteContact(contact.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-text-secondary hover:text-danger transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardTitle>Notification Preferences</CardTitle>
        <div className="mt-3 space-y-3">
          {[
            { key: 'trip_started', label: 'Trip started' },
            { key: 'child_picked_up', label: 'Child picked up' },
            { key: 'child_dropped_off', label: 'Child dropped off' },
            { key: 'at_school', label: 'Arrived at school' },
            { key: 'speed_alert', label: 'Speed alert' },
            { key: 'route_deviation', label: 'Route deviation' },
            { key: 'approach_alert', label: 'Driver approaching' },
            { key: 'broadcast_messages', label: 'Broadcast messages' },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between py-1">
              <span className="text-sm text-text-primary">{label}</span>
              <button
                onClick={() => handleToggleNotifPref(key)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  notifPrefs[key] ? 'bg-primary' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                    notifPrefs[key] ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
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

      {/* Privacy & Data */}
      <Card>
        <CardTitle>Privacy & Data</CardTitle>
        <div className="mt-3 space-y-2">
          <button onClick={handleDownloadData} className="w-full text-left text-sm p-2.5 rounded-xl hover:bg-gray-50 transition flex items-center gap-2.5">
            <Download className="h-4 w-4 text-text-secondary" /> Download My Data
          </button>
          <a href="https://kelyratech.co.za/privacy" target="_blank" rel="noopener noreferrer"
            className="w-full text-left text-sm p-2.5 rounded-xl hover:bg-gray-50 transition flex items-center gap-2.5 block">
            <Shield className="h-4 w-4 text-text-secondary" /> Privacy Policy & Terms
          </a>
          <button onClick={() => setShowDeleteAccount(true)} className="w-full text-left text-sm text-danger p-2.5 rounded-xl hover:bg-red-50 transition flex items-center gap-2.5">
            <Trash2 className="h-4 w-4" /> Request Account Deletion
          </button>
        </div>
      </Card>

      <Button variant="outline" fullWidth onClick={signOut}>Sign Out</Button>

      {/* Add Child Modal */}
      <Modal isOpen={showAddChild} onClose={() => setShowAddChild(false)} title="Add Child">
        <form onSubmit={handleAddChild} className="space-y-4">
          {error && <p className="text-sm text-danger">{error}</p>}
          <Input label="Child's Full Name" value={childForm.full_name} onChange={(e) => setChildForm(f => ({...f, full_name: e.target.value}))} required />
          <Input label="School Name" value={childForm.school_name} onChange={(e) => setChildForm(f => ({...f, school_name: e.target.value}))} required />
          <Input label="Grade (optional)" value={childForm.grade} onChange={(e) => setChildForm(f => ({...f, grade: e.target.value}))} />
          <Button type="submit" fullWidth loading={saving}>Add Child</Button>
        </form>
      </Modal>

      {/* Link Route Modal */}
      <Modal isOpen={showLinkRoute} onClose={() => { setShowLinkRoute(false); setLinkChildId(null) }} title="Link to Driver Route">
        <form onSubmit={handleLinkRoute} className="space-y-4">
          {error && <p className="text-sm text-danger">{error}</p>}
          <p className="text-sm text-text-secondary">Enter the 6-digit route code provided by your child's driver.</p>
          <Input label="Route Code" value={routeCode} onChange={(e) => setRouteCode(e.target.value.toUpperCase())} placeholder="e.g. SRK652" maxLength={6} required />
          <Button type="submit" fullWidth loading={saving}>Link Route</Button>
        </form>
      </Modal>

      {/* Delete Account Modal */}
      <Modal isOpen={showDeleteAccount} onClose={() => setShowDeleteAccount(false)} title="Delete Account">
        <div className="text-center">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-7 w-7 text-danger" />
          </div>
          <p className="text-sm text-text-secondary mb-6">
            This will deactivate your account and request deletion of all your personal data within 48 hours, as required by POPIA. This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" fullWidth onClick={() => setShowDeleteAccount(false)}>Cancel</Button>
            <Button variant="danger" fullWidth onClick={handleDeleteAccount}>Delete My Account</Button>
          </div>
        </div>
      </Modal>

      {/* Remove Child confirmation modal */}
      <Modal isOpen={!!showRemoveChild} onClose={() => setShowRemoveChild(null)} title="Remove Child" size="sm">
        <p className="text-sm text-text-secondary mb-4">Remove this child from your account? This will also unlink them from any routes.</p>
        <div className="flex gap-3">
          <Button variant="outline" fullWidth onClick={() => setShowRemoveChild(null)}>Cancel</Button>
          <Button variant="danger" fullWidth onClick={confirmRemoveChild}>Remove</Button>
        </div>
      </Modal>

      {/* Add Emergency Contact Modal */}
      <Modal isOpen={showAddContact} onClose={() => { setShowAddContact(false); setError('') }} title="Add Emergency Contact">
        <form onSubmit={handleAddContact} className="space-y-4">
          {error && <p className="text-sm text-danger">{error}</p>}
          <Input label="Name" value={contactForm.name} onChange={(e) => setContactForm(f => ({...f, name: e.target.value}))} required />
          <Input label="Phone Number" type="tel" value={contactForm.phone} onChange={(e) => setContactForm(f => ({...f, phone: e.target.value}))} required />
          <Input label="Relationship (optional)" value={contactForm.relationship} onChange={(e) => setContactForm(f => ({...f, relationship: e.target.value}))} placeholder="e.g. Spouse, Grandparent" />
          <Button type="submit" fullWidth loading={saving}>Add Contact</Button>
        </form>
      </Modal>

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
          <button onClick={() => setNotification('')} className="ml-3 text-white/60 hover:text-white">✕</button>
        </div>
      )}
    </div>
  )
}
