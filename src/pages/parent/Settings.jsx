import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { initiatePayment, PLAN_DETAILS } from '../../lib/payfast'
import Card, { CardTitle } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Badge from '../../components/ui/Badge'
import { User, Plus, Trash2, Link2, CreditCard, Shield, Bell, Download, AlertTriangle } from 'lucide-react'
import { SPEED_THRESHOLD_DEFAULT } from '../../lib/constants'

export default function ParentSettings() {
  const { profile, updateProfile, signOut } = useAuth()
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

  useEffect(() => { fetchChildren() }, [profile])

  // Check for payment return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('payment') === 'success') {
      alert('Payment successful! Your subscription has been upgraded.')
      window.history.replaceState({}, '', window.location.pathname)
    } else if (params.get('payment') === 'cancelled') {
      alert('Payment was cancelled.')
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
      const { data: driver, error: driverErr } = await supabase
        .from('drivers')
        .select('id, routes(id)')
        .eq('route_code', routeCode.trim().toUpperCase())
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
    if (!confirm('Remove this child from your account?')) return
    await supabase.from('child_route_assignments').delete().eq('child_id', childId)
    await supabase.from('children').delete().eq('id', childId)
    fetchChildren()
  }

  function handleUpgrade(plan) {
    initiatePayment({
      plan,
      user: profile,
    })
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
    // Log deletion request
    await supabase.from('consent_records').insert({
      user_id: profile.id,
      consent_type: 'deletion_request',
      consent_version: '1.0',
    })
    await supabase.from('users').update({ is_active: false }).eq('id', profile.id)
    alert('Your account deletion request has been submitted. Your data will be purged within 48 hours as per POPIA requirements.')
    signOut()
  }

  async function handleSaveSpeedThreshold() {
    // Store in user metadata via Supabase auth
    await supabase.auth.updateUser({
      data: { speed_threshold: speedThreshold }
    })
    alert('Speed alert threshold updated.')
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
    </div>
  )
}
